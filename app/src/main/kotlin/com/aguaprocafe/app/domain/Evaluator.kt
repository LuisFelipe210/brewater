package com.aguaprocafe.app.domain

import kotlin.math.min
import kotlin.math.roundToInt

enum class Status(val label: String) {
    MUITO_BAIXO("Baixo demais"),
    BAIXO("Um pouco baixo"),
    IDEAL("Ideal"),
    ALTO("Um pouco alto"),
    MUITO_ALTO("Alto demais"),
}

/**
 * Faixa de um parâmetro: nota 1 dentro do ideal, cai para 0,6 até a borda do aceitável
 * e chega a 0 em [zeroMin] / [zeroMax].
 */
data class Faixa(
    val zeroMin: Double,
    val okMin: Double,
    val idealMin: Double,
    val idealMax: Double,
    val okMax: Double,
    val zeroMax: Double,
) {
    fun score(v: Double): Double = when {
        v < okMin -> 0.6 * ((v - zeroMin) / (okMin - zeroMin)).coerceIn(0.0, 1.0)
        v < idealMin -> 0.6 + 0.4 * (v - okMin) / (idealMin - okMin)
        v <= idealMax -> 1.0
        v <= okMax -> 1.0 - 0.4 * (v - idealMax) / (okMax - idealMax)
        else -> 0.6 * ((zeroMax - v) / (zeroMax - okMax)).coerceIn(0.0, 1.0)
    }

    fun status(v: Double): Status = when {
        v < okMin -> Status.MUITO_BAIXO
        v < idealMin -> Status.BAIXO
        v <= idealMax -> Status.IDEAL
        v <= okMax -> Status.ALTO
        else -> Status.MUITO_ALTO
    }

    /** Parâmetros em que só existe limite superior (sódio, cloreto, sulfato). */
    val somenteMaximo get() = idealMin <= 0.0
}

/**
 * Faixas baseadas no padrão de água da SCA (Specialty Coffee Association) — TDS alvo 150 mg/L
 * (75–250), alcalinidade perto de 40 mg/L CaCO₃, pH 6,5–7,5, sódio ~10 mg/L — e no SCA Water
 * Chart para a dureza total.
 */
enum class Param(
    val title: String,
    val unit: String,
    val weight: Int,
    val faixa: Faixa,
    private val mensagens: Map<Status, String>,
) {
    ALCALINIDADE(
        "Alcalinidade (KH)", "mg/L CaCO₃", 30,
        Faixa(0.0, 20.0, 30.0, 60.0, 80.0, 160.0),
        mapOf(
            Status.MUITO_BAIXO to "Quase sem tampão: o café tende a ficar ácido demais, agressivo e desequilibrado.",
            Status.BAIXO to "Um pouco abaixo do ideal: acidez mais viva; pode passar do ponto em cafés já muito ácidos.",
            Status.IDEAL to "Tamponamento equilibrado: preserva a acidez sem deixá-la agressiva.",
            Status.ALTO to "Um pouco acima: começa a neutralizar a acidez e o café fica mais plano.",
            Status.MUITO_ALTO to "Excesso de bicarbonato: “mata” a acidez e as notas frutadas; café chato e terroso.",
        ),
    ),
    DUREZA(
        "Dureza total (GH)", "mg/L CaCO₃", 30,
        Faixa(0.0, 25.0, 50.0, 110.0, 175.0, 300.0),
        mapOf(
            Status.MUITO_BAIXO to "Poucos minerais (cálcio e magnésio) para extrair: café ralo, sem corpo, sub-extraído.",
            Status.BAIXO to "Dureza baixa: extração um pouco mais fraca; funciona melhor com torras mais escuras.",
            Status.IDEAL to "Boa quantidade de cálcio e magnésio para extrair doçura e corpo.",
            Status.ALTO to "Dureza um pouco alta: mais corpo, mas pode trazer amargor e calcário em máquinas.",
            Status.MUITO_ALTO to "Dureza excessiva: sobre-extração, sabor pesado e muito calcário em máquinas de espresso.",
        ),
    ),
    TDS(
        "Sólidos dissolvidos (TDS)", "mg/L", 15,
        Faixa(10.0, 75.0, 100.0, 200.0, 250.0, 500.0),
        mapOf(
            Status.MUITO_BAIXO to "Água muito “vazia”: extração fraca e café sem estrutura.",
            Status.BAIXO to "Um pouco abaixo do alvo de 150 mg/L da SCA.",
            Status.IDEAL to "Dentro da faixa recomendada pela SCA (alvo 150 mg/L).",
            Status.ALTO to "Um pouco alto: os sabores podem ficar menos limpos.",
            Status.MUITO_ALTO to "Água muito mineralizada: sabores turvos que mascaram notas delicadas.",
        ),
    ),
    SODIO(
        "Sódio", "mg/L", 10,
        Faixa(0.0, 0.0, 0.0, 10.0, 30.0, 100.0),
        mapOf(
            Status.IDEAL to "Sódio baixo, sem interferência no sabor.",
            Status.ALTO to "Acima de 10 mg/L: pode reduzir a percepção de doçura.",
            Status.MUITO_ALTO to "Sódio alto: gosto salgado ou “ensaboado” no café.",
        ),
    ),
    PH(
        "pH", "", 5,
        Faixa(4.0, 6.0, 6.5, 7.5, 8.5, 10.0),
        mapOf(
            Status.MUITO_BAIXO to "pH bem ácido. Em água engarrafada pesa menos que a alcalinidade, mas indica pouca proteção contra acidez.",
            Status.BAIXO to "Levemente ácido; a alcalinidade importa mais que o pH.",
            Status.IDEAL to "Neutro, como recomenda a SCA (6,5–7,5).",
            Status.ALTO to "Levemente alcalino.",
            Status.MUITO_ALTO to "Muito alcalino: tende a achatar a acidez do café.",
        ),
    ),
    SULFATO(
        "Sulfato", "mg/L", 5,
        Faixa(0.0, 0.0, 0.0, 50.0, 150.0, 400.0),
        mapOf(
            Status.IDEAL to "Sulfato baixo.",
            Status.ALTO to "Sulfato moderado: pode trazer leve secura no final.",
            Status.MUITO_ALTO to "Sulfato alto: secura e amargor no final.",
        ),
    ),
    CLORETO(
        "Cloreto", "mg/L", 5,
        Faixa(0.0, 0.0, 0.0, 30.0, 100.0, 300.0),
        mapOf(
            Status.IDEAL to "Cloreto baixo.",
            Status.ALTO to "Cloreto moderado: atenção à corrosão em caldeiras de espresso.",
            Status.MUITO_ALTO to "Cloreto alto: gosto salgado e corrosão em caldeiras.",
        ),
    ),
    ;

    fun message(s: Status): String = mensagens[s] ?: mensagens.getValue(Status.IDEAL)

    val faixaTexto: String
        get() = with(faixa) {
            if (somenteMaximo) "ideal até ${fmt(idealMax)}" else "ideal ${fmt(idealMin)}–${fmt(idealMax)}"
        }

    val aceitavelTexto: String
        get() = with(faixa) {
            if (somenteMaximo) "aceitável até ${fmt(okMax)}" else "aceitável ${fmt(okMin)}–${fmt(okMax)}"
        }
}

data class ParamResult(val param: Param, val value: Double, val status: Status, val score: Double) {
    val message get() = param.message(status)
}

enum class Verdict(val title: String, val description: String) {
    EXCELENTE("Excelente para café especial", "Mineralização equilibrada para extrair doçura, corpo e uma acidez limpa."),
    BOA("Boa para café especial", "Funciona bem, com pequenos desvios do ideal."),
    REGULAR("Regular", "Dá para usar, mas vai interferir no sabor. Veja como melhorar abaixo."),
    RUIM("Não recomendada", "Muito fora dos parâmetros para café especial."),
    INSUFICIENTE(
        "Faltam dados",
        "Preciso de cálcio e magnésio (dureza) e de bicarbonato (alcalinidade), ou de GH e KH medidos.",
    ),
}

data class Evaluation(
    val score: Int?,
    val verdict: Verdict,
    val results: List<ParamResult>,
    val notes: List<String>,
    val profile: WaterProfile,
)

object Evaluator {
    /** Sem dureza ou alcalinidade dentro do aceitável a nota não passa de "Regular". */
    private const val TETO_CRITICO = 69.0

    fun evaluate(p: WaterProfile): Evaluation {
        val results = valores(p).map { (param, v) ->
            ParamResult(param, v, param.faixa.status(v), param.faixa.score(v))
        }
        val notes = p.avisos + observacoes(p)
        val score = rawScore(p) ?: return Evaluation(null, Verdict.INSUFICIENTE, results, notes, p)
        val nota = score.roundToInt()
        val verdict = when {
            nota >= 85 -> Verdict.EXCELENTE
            nota >= 70 -> Verdict.BOA
            nota >= 50 -> Verdict.REGULAR
            else -> Verdict.RUIM
        }
        return Evaluation(nota, verdict, results, notes, p)
    }

    /** Nota de 0 a 100, ou null se faltar dureza ou alcalinidade. */
    fun rawScore(p: WaterProfile): Double? {
        if (p.gh == null || p.kh == null) return null
        val vals = valores(p)
        val total = vals.sumOf { it.first.weight }
        var score = vals.sumOf { (param, v) -> param.weight * param.faixa.score(v) } / total * 100
        val critico = vals.any { (param, v) ->
            (param == Param.ALCALINIDADE || param == Param.DUREZA) &&
                param.faixa.status(v).let { it == Status.MUITO_BAIXO || it == Status.MUITO_ALTO }
        }
        if (critico) score = min(score, TETO_CRITICO)
        return score
    }

    private fun valores(p: WaterProfile): List<Pair<Param, Double>> = listOfNotNull(
        p.kh?.let { Param.ALCALINIDADE to it },
        p.gh?.let { Param.DUREZA to it },
        p.tds?.let { Param.TDS to it },
        p.sodio?.let { Param.SODIO to it },
        p.ph?.let { Param.PH to it },
        p.sulfato?.let { Param.SULFATO to it },
        p.cloreto?.let { Param.CLORETO to it },
    )

    private fun observacoes(p: WaterProfile): List<String> = buildList {
        val ca = p.calcio
        val mg = p.magnesio
        if (ca != null && mg != null && ca + mg > 0) {
            val caH = ca * Chemistry.CA_CACO3
            val mgH = mg * Chemistry.MG_CACO3
            when {
                mgH > caH * 1.2 -> add("Rica em magnésio: costuma realçar doçura e notas frutadas.")
                caH > mgH * 2 -> add("Predomínio de cálcio: tende a dar mais corpo e textura do que brilho.")
                else -> add("Cálcio e magnésio equilibrados.")
            }
        }
        if ((p.gh ?: 0.0) >= 120) {
            add("Em máquinas de espresso, dureza acima de ~120 mg/L favorece calcário; prefira usar diluída.")
        }
        if ((p.cloreto ?: 0.0) >= 30) {
            add("Cloreto acima de 30 mg/L aumenta o risco de corrosão em caldeiras de espresso.")
        }
        when (p.tdsSource) {
            TdsSource.CONDUTIVIDADE, TdsSource.IONS -> add("TDS ${p.tdsSource.description}.")
            else -> {}
        }
    }
}
