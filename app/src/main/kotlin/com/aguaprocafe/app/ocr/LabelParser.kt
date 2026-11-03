package com.aguaprocafe.app.ocr

import com.aguaprocafe.app.model.Field
import java.text.Normalizer
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

data class OcrWord(val text: String, val left: Int, val top: Int, val right: Int, val bottom: Int)

data class OcrLine(
    val text: String,
    val left: Int,
    val top: Int,
    val right: Int,
    val bottom: Int,
    val words: List<OcrWord> = emptyList(),
) {
    val height get() = (bottom - top).coerceAtLeast(1)
}

data class ParsedLabel(val values: Map<Field, Double>, val source: String?)

/**
 * Lê o texto reconhecido de um rótulo de água mineral brasileira e extrai a composição.
 *
 * O OCR agrupa as linhas de forma imprevisível (em garrafa curva, "Sódio" pode sair numa linha
 * e "6,652 Nitrato" em outra), então cada nome é ligado ao número mais próximo **pela posição na
 * foto**: primeiro na mesma linha, depois na mesma altura à direita e, por fim, logo abaixo
 * (tabela com os nomes em cima). Depende só das caixas de texto, então dá para testar sem Android.
 */
object LabelParser {
    private val outros = listOf(
        "estroncio", "bario", "litio", "silica", "vanadio", "ferro", "zinco", "aluminio", "boro",
        "manganes", "cobre", "cromo", "selenio", "iodeto", "brometo", "fosfato", "nitrito", "borato",
        "cobalto", "arsenio", "temperatura", "radioatividade",
    )

    private val exatos: List<Pair<Field?, Regex>> = listOf(
        Field.BICARBONATO to Regex("""bicarbonato|hidrogenocarbonato|\bhco\s?3"""),
        Field.CARBONATO to Regex("""(?<!bi)(?<!hidrogeno)carbonato"""),
        Field.CALCIO to Regex("""\bcalc[i1l]o\b"""),
        Field.MAGNESIO to Regex("""\b(?:m|rn)agnes[i1l]o\b"""),
        Field.SODIO to Regex("""\bsod[i1l]o\b"""),
        Field.POTASSIO to Regex("""\bpotass[i1l]o\b"""),
        Field.SULFATO to Regex("""\bsulfato"""),
        Field.CLORETO to Regex("""\bcloreto"""),
        Field.NITRATO to Regex("""\bnitrato"""),
        Field.FLUORETO to Regex("""\bfluoreto"""),
        Field.PH to Regex("""\bph\b"""),
        Field.CONDUTIVIDADE to Regex("""condutividade|condutancia"""),
        Field.RESIDUO to Regex("""residuo|solidos\s+(?:totais\s+)?dissolvidos"""),
        // Itens que não usamos, mas que marcam onde termina o valor do item anterior.
        null to Regex("""\b(?:${outros.joinToString("|")})\b"""),
    )

    /** Nomes aceitos com erro de OCR ("Sufato", "Macnésio"). */
    private val aproximados: List<Pair<Field?, String>> = listOf(
        Field.BICARBONATO to "bicarbonato", Field.CARBONATO to "carbonato", Field.CALCIO to "calcio",
        Field.MAGNESIO to "magnesio", Field.SODIO to "sodio", Field.POTASSIO to "potassio",
        Field.SULFATO to "sulfato", Field.CLORETO to "cloreto", Field.NITRATO to "nitrato",
        Field.FLUORETO to "fluoreto", Field.CONDUTIVIDADE to "condutividade", Field.RESIDUO to "residuo",
    ) + outros.filter { it.length >= 5 }.map { null to it }

    private val palavra = Regex("""\p{L}{5,}""")

    /** Não começa colado numa letra (HCO3, SO4) nem em "letra + vírgula" (O,956 antes da correção). */
    private val numero = Regex("""(?<![\p{L}\d])(?<![\p{L}\d][.,])\d+(?:[.,]\d+)?""")

    /** "1,52 x 10²", "1,52 x 10^2", "1,52x10-1" */
    private val notacaoCientifica = Regex("""^\s*[x×]\s*10\s*\^?\s*([-⁻]?)\s*([0-9⁰¹²³⁴⁵⁶⁷⁸⁹]+)""")

    /** "25°C", "25 ºC", "25oC", "180 C" e o "a 25" que sobra quando o OCR perde o "°C". */
    private val temperatura = Regex("""\d+(?:[.,]\d+)?\s*(?:[°º˚]\s*c?|o?\s*c\b)|\ba\s+(?:20|25|180)\b(?!\s*[.,]\d)""")

    /** "O,956" → "0,956", "l,225" → "1,225" */
    private val letraNoNumero = Regex("""(?<![\p{L}\d])[oli|](?=[.,]\d)""")

    private val unidades = Regex("""mg\s*/\s*l|[uµ]s\s*/\s*cm|ppm""")

    private val superscritos = mapOf(
        '⁰' to '0', '¹' to '1', '²' to '2', '³' to '3', '⁴' to '4',
        '⁵' to '5', '⁶' to '6', '⁷' to '7', '⁸' to '8', '⁹' to '9',
    )

    /** Trecho de uma linha (nome ou número) com a posição dele na foto. */
    private class Peca(
        val linha: Int,
        val inicio: Int,
        val fim: Int,
        val left: Float,
        val right: Float,
        val top: Float,
        val bottom: Float,
        val field: Field? = null,
        val valor: Double? = null,
    ) {
        val cx get() = (left + right) / 2
        val cy get() = (top + bottom) / 2
        val h get() = max(bottom - top, 1f)
        val ordem get() = linha * 100_000 + inicio

        fun mesmaAltura(o: Peca) = abs(o.cy - cy) <= 0.6f * max(h, o.h)
    }

    private class Linha(val src: OcrLine, val texto: String, val chaves: List<Peca>, val numeros: List<Peca>) {
        /** Só números e unidades: candidata a linha de valores de uma tabela horizontal. */
        val soNumeros = numeros.isNotEmpty() &&
            !Regex("""\p{L}{2,}""").containsMatchIn(unidades.replace(numero.replace(texto, " "), " "))
    }

    private data class Candidato(val field: Field, val value: Double, val prioridade: Int, val ordem: Int)

    /** Minúsculas e sem acento, mantendo o mesmo comprimento (as posições continuam batendo). */
    fun normalize(s: String): String = buildString(s.length) {
        for (c in s) {
            val base = Normalizer.normalize(c.toString(), Normalizer.Form.NFD).firstOrNull() ?: c
            append(Character.toLowerCase(base))
        }
    }

    fun parse(lines: List<OcrLine>): ParsedLabel {
        val linhas = lines.mapIndexed(::preparar)
        val chaves = linhas.flatMap { it.chaves }
        val numeros = linhas.flatMap { it.numeros }

        val candidatos = mutableListOf<Candidato>()
        for (k in chaves) {
            val field = k.field ?: continue
            val estrategias = listOf(
                { naMesmaLinha(k, linhas[k.linha]) },
                { naMesmaAltura(k, chaves, numeros) },
                { logoAbaixo(k, linhas, numeros) },
            )
            for ((prioridade, busca) in estrategias.withIndex()) {
                val v = busca()?.valor ?: continue
                if (plausivel(field, v)) {
                    candidatos += Candidato(field, v, prioridade, k.ordem)
                    break
                }
            }
        }

        val values = candidatos
            .groupBy { it.field }
            .mapValues { (_, cs) -> cs.minWith(compareBy({ it.prioridade }, { it.ordem })).value }

        return ParsedLabel(values, adivinharFonte(lines))
    }

    private fun preparar(i: Int, l: OcrLine): Linha {
        val original = Normalizer.normalize(l.text, Normalizer.Form.NFC)
        var texto = normalize(original)
        texto = temperatura.replace(texto) { " ".repeat(it.value.length) }
        texto = letraNoNumero.replace(texto) { if (it.value == "o") "0" else "1" }

        val geo = Geometria(l, original)

        val chaves = mutableListOf<Peca>()
        for ((f, re) in exatos) {
            re.findAll(texto).forEach { m -> chaves += geo.peca(i, m.range.first, m.range.last + 1, field = f) }
        }
        for (m in palavra.findAll(texto)) {
            if (chaves.any { it.inicio <= m.range.last && m.range.first < it.fim }) continue
            aproximado(m.value)?.let { (f) -> chaves += geo.peca(i, m.range.first, m.range.last + 1, field = f) }
        }
        // Mesmo nome duas vezes na linha ("Bicarbonato (HCO3-)"): fica o primeiro.
        val unicas = chaves.sortedBy { it.inicio }
            .filterIndexed { idx, c -> c.field == null || chaves.sortedBy { it.inicio }.take(idx).none { it.field == c.field } }

        val numeros = mutableListOf<Peca>()
        var de = 0
        while (true) {
            val m = numero.find(texto, de) ?: break
            var fim = m.range.last + 1
            var v = numeroDe(m.value)
            notacaoCientifica.find(texto.substring(fim))?.let { sci ->
                var digitos = sci.groupValues[2].map { superscritos[it] ?: it }.joinToString("")
                if (digitos.length >= 2 && digitos.toInt() > 9) digitos = digitos.takeLast(1) // "10²" lido como "102"
                val exp = digitos.toInt() * if (sci.groupValues[1].isNotEmpty()) -1 else 1
                v = v?.times(10.0.pow(exp))
                fim += sci.range.last + 1
            }
            if (v != null) numeros += geo.peca(i, m.range.first, fim, valor = v)
            de = fim
        }
        return Linha(l, texto, unicas, numeros)
    }

    /** "0477": o OCR perdeu a vírgula de "0,477". */
    private fun numeroDe(s: String): Double? {
        val t = if (s.length >= 2 && s[0] == '0' && s.all { it.isDigit() }) "0." + s.substring(1) else s.replace(',', '.')
        return t.toDoubleOrNull()
    }

    private fun aproximado(w: String): Pair<Field?, String>? {
        val dist = aproximados
            .map { it to levenshtein(w, it.second) }
            .filter { (b, d) -> d <= if (b.second.length >= 9) 2 else 1 }
        val melhor = dist.minOfOrNull { it.second } ?: return null
        return dist.filter { it.second == melhor }.singleOrNull()?.first
    }

    // --- estratégias ---

    /** "Cálcio ...... 8,345" ou "Sulfato 0,85 Cloreto 1,30": até o próximo nome da linha. */
    private fun naMesmaLinha(k: Peca, l: Linha): Peca? {
        val proxima = l.chaves.filter { it.inicio > k.inicio }.minOfOrNull { it.inicio } ?: Int.MAX_VALUE
        return l.numeros.filter { it.inicio >= k.fim && it.inicio < proxima }.minByOrNull { it.inicio }
    }

    /** Valor em outra linha do OCR, na mesma altura e à direita, sem outro nome no caminho. */
    private fun naMesmaAltura(k: Peca, chaves: List<Peca>, numeros: List<Peca>): Peca? {
        val inicio = k.right - 0.5f * k.h
        return numeros
            .filter { n ->
                n.linha != k.linha && k.mesmaAltura(n) && n.left >= inicio && n.left - k.right <= 10 * k.h &&
                    chaves.none { c -> c !== k && k.mesmaAltura(c) && c.left >= inicio && c.left < n.left }
            }
            .minByOrNull { it.left - k.right }
    }

    /** Tabela horizontal: nomes numa linha, valores na linha de baixo, alinhados. */
    private fun logoAbaixo(k: Peca, linhas: List<Linha>, numeros: List<Peca>): Peca? {
        val cands = numeros.filter { n ->
            n.linha != k.linha && linhas[n.linha].soNumeros &&
                n.top >= k.cy && n.top - k.bottom <= 1.5f * k.h &&
                n.left <= k.right + k.h && n.right >= k.left - k.h
        }
        val linha = cands.minByOrNull { linhas[it.linha].src.top }?.linha ?: return null
        return cands.filter { it.linha == linha }.minByOrNull { abs(it.cx - k.cx) }
    }

    private fun plausivel(f: Field, v: Double) = when (f) {
        Field.PH -> v in 3.0..11.0
        Field.CONDUTIVIDADE, Field.RESIDUO -> v in 1.0..5000.0
        Field.NITRATO -> v in 0.0..50.0 // limite legal para água mineral
        Field.FLUORETO -> v in 0.0..5.0
        else -> v in 0.0..2000.0
    }

    /** "Fonte: Pocinho — Lindóia/SP" ou "FONTE SENHOR DO BONFIM - DIAS D'ÁVILA/BA." */
    private fun adivinharFonte(lines: List<OcrLine>): String? = lines
        .firstOrNull { normalize(it.text).trimStart().startsWith("fonte") }
        ?.text
        ?.trim()
        ?.let { if (':' in it) it.substringAfter(':') else it.substringAfter(' ', "") }
        ?.replace(Regex("""(?<=\p{L})0|0(?=\p{L})"""), "O") // "D0 BONFIM"
        ?.trim()
        ?.trimEnd('.')
        ?.takeIf { it.length >= 3 }

    /** Posição (em pixels) de cada caractere da linha, usando as caixas das palavras quando existem. */
    private class Geometria(l: OcrLine, texto: String) {
        private val n = max(texto.length, 1)
        private val x0 = FloatArray(n)
        private val x1 = FloatArray(n)
        private val top = FloatArray(n) { l.top.toFloat() }
        private val bottom = FloatArray(n) { l.bottom.toFloat() }

        init {
            val cw = (l.right - l.left).toFloat() / n
            for (i in 0 until n) {
                x0[i] = l.left + i * cw
                x1[i] = x0[i] + cw
            }
            var cursor = 0
            for (w in l.words) {
                val wt = Normalizer.normalize(w.text, Normalizer.Form.NFC)
                val idx = texto.indexOf(wt, cursor)
                if (wt.isEmpty() || idx < 0) continue
                val wcw = (w.right - w.left).toFloat() / wt.length
                for (k in wt.indices) {
                    x0[idx + k] = w.left + k * wcw
                    x1[idx + k] = x0[idx + k] + wcw
                    top[idx + k] = w.top.toFloat()
                    bottom[idx + k] = w.bottom.toFloat()
                }
                cursor = idx + wt.length
            }
        }

        fun peca(linha: Int, inicio: Int, fim: Int, field: Field? = null, valor: Double? = null): Peca {
            val a = inicio.coerceIn(0, n - 1)
            val b = fim.coerceIn(a + 1, n)
            var l = Float.MAX_VALUE
            var r = -Float.MAX_VALUE
            var t = Float.MAX_VALUE
            var bo = -Float.MAX_VALUE
            for (i in a until b) {
                l = min(l, x0[i])
                r = max(r, x1[i])
                t = min(t, top[i])
                bo = max(bo, bottom[i])
            }
            return Peca(linha, inicio, fim, l, r, t, bo, field, valor)
        }
    }

    private fun levenshtein(a: String, b: String): Int {
        var prev = IntArray(b.length + 1) { it }
        for (i in 1..a.length) {
            val cur = IntArray(b.length + 1)
            cur[0] = i
            for (j in 1..b.length) {
                cur[j] = minOf(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + if (a[i - 1] == b[j - 1]) 0 else 1)
            }
            prev = cur
        }
        return prev[b.length]
    }
}
