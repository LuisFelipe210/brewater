package com.aguaprocafe.app

import com.aguaprocafe.app.model.Field
import com.aguaprocafe.app.ocr.LabelParser
import com.aguaprocafe.app.ocr.OcrLine
import com.aguaprocafe.app.ocr.OcrWord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LabelParserTest {

    /** Uma linha por item, uma embaixo da outra. */
    private fun linhas(vararg textos: String) = textos.mapIndexed { i, t ->
        OcrLine(t, 0, i * 40, t.length * 12, i * 40 + 30)
    }

    private fun assertValor(esperado: Double, real: Double?) = assertEquals(esperado, real!!, 1e-6)

    @Test
    fun `rotulo com valores na mesma linha`() {
        val r = LabelParser.parse(
            linhas(
                "COMPOSIÇÃO QUÍMICA (mg/L)",
                "Bicarbonato (HCO3-) ........ 45,20",
                "Cálcio ......................... 8,345",
                "Magnésio...................2,10",
                "Sódio  5,4  mg/L",
                "Potássio 1,12",
                "Sulfato 0,85 Cloreto 1,30",
                "Nitrato < 0,01",
                "Estrôncio 0,045",
                "CARACTERÍSTICAS FÍSICO-QUÍMICAS",
                "pH a 25°C ................ 7,45",
                "Temperatura da água na fonte 22,3°C",
                "Condutividade elétrica a 25 ºC 125,3 µS/cm",
                "Resíduo de evaporação a 180°C, calculado ..... 95,26 mg/L",
            ),
        )
        val v = r.values
        assertValor(45.2, v[Field.BICARBONATO])
        assertValor(8.345, v[Field.CALCIO])
        assertValor(2.1, v[Field.MAGNESIO])
        assertValor(5.4, v[Field.SODIO])
        assertValor(1.12, v[Field.POTASSIO])
        assertValor(0.85, v[Field.SULFATO])
        assertValor(1.3, v[Field.CLORETO])
        assertValor(0.01, v[Field.NITRATO])
        assertValor(7.45, v[Field.PH])
        assertValor(125.3, v[Field.CONDUTIVIDADE])
        assertValor(95.26, v[Field.RESIDUO])
        assertNull(v[Field.CARBONATO])
    }

    @Test
    fun `OCR sem acento e sem grau`() {
        val v = LabelParser.parse(
            linhas("Calcio 12.5", "rnagnesio 3,2", "pH a 25 C 6,8", "Condutividade eletrica a 25 C 98"),
        ).values
        assertValor(12.5, v[Field.CALCIO])
        assertValor(3.2, v[Field.MAGNESIO])
        assertValor(6.8, v[Field.PH])
        assertValor(98.0, v[Field.CONDUTIVIDADE])
    }

    @Test
    fun `tabela em duas colunas`() {
        // Nomes à esquerda, valores numa coluna separada à direita.
        val nomes = listOf("Bicarbonato", "Cálcio", "Magnésio", "Sódio")
        val valores = listOf("60,1", "15,3", "4,8", "3,9")
        val lines = nomes.mapIndexed { i, n -> OcrLine(n, 10, 100 + i * 50, 200, 135 + i * 50) } +
            valores.mapIndexed { i, n -> OcrLine("$n mg/L", 400, 102 + i * 50, 520, 137 + i * 50) }
        val v = LabelParser.parse(lines.shuffled(java.util.Random(1))).values
        assertValor(60.1, v[Field.BICARBONATO])
        assertValor(15.3, v[Field.CALCIO])
        assertValor(4.8, v[Field.MAGNESIO])
        assertValor(3.9, v[Field.SODIO])
    }

    @Test
    fun `tabela horizontal com nomes em cima e valores embaixo`() {
        val cab = OcrLine(
            "Cálcio Magnésio Sódio", 0, 0, 600, 30,
            listOf(OcrWord("Cálcio", 0, 0, 150, 30), OcrWord("Magnésio", 220, 0, 400, 30), OcrWord("Sódio", 470, 0, 600, 30)),
        )
        val vals = OcrLine(
            "9,87 2,30 1,05", 0, 40, 600, 70,
            listOf(OcrWord("9,87", 30, 40, 120, 70), OcrWord("2,30", 260, 40, 350, 70), OcrWord("1,05", 490, 40, 580, 70)),
        )
        val v = LabelParser.parse(listOf(cab, vals)).values
        assertValor(9.87, v[Field.CALCIO])
        assertValor(2.3, v[Field.MAGNESIO])
        assertValor(1.05, v[Field.SODIO])
    }

    @Test
    fun `condutividade em notacao cientifica`() {
        val v = LabelParser.parse(linhas("Condutividade elétrica a 25°C: 1,52 x 10² µS/cm")).values
        assertValor(152.0, v[Field.CONDUTIVIDADE])
    }

    @Test
    fun `classificacao nao vira valor`() {
        val v = LabelParser.parse(
            linhas("Classificação: Água mineral fluoretada, alcalino-bicarbonatada, cálcica", "Cálcio 7,7"),
        ).values
        assertEquals(setOf(Field.CALCIO), v.keys)
    }

    @Test
    fun fonte() {
        val lines = listOf(
            OcrLine("PEDRA AZUL", 0, 0, 400, 90),
            OcrLine("Água mineral natural sem gás", 0, 100, 400, 130),
            OcrLine("Fonte: Bica da Serra - Vale/MG", 0, 140, 400, 170),
            OcrLine("Cálcio 4,2", 0, 180, 400, 210),
            OcrLine("Magnésio 1,1", 0, 220, 400, 250),
        )
        assertEquals("Bica da Serra - Vale/MG", LabelParser.parse(lines).source)
        assertEquals("BICA DA SERRA", LabelParser.parse(linhas("FONTE BICA DA SERRA.")).source)
    }
}
