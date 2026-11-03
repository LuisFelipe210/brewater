package com.aguaprocafe.app

import com.aguaprocafe.app.domain.Evaluator
import com.aguaprocafe.app.domain.Improvements
import com.aguaprocafe.app.domain.Status
import com.aguaprocafe.app.domain.TdsSource
import com.aguaprocafe.app.domain.Verdict
import com.aguaprocafe.app.domain.WaterProfile
import com.aguaprocafe.app.model.Field
import com.aguaprocafe.app.model.WaterLabel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class EvaluatorTest {

    private fun avaliar(vararg v: Pair<Field, Double>) = Evaluator.evaluate(WaterProfile.from(mapOf(*v)))

    @Test
    fun `conversoes para CaCO3`() {
        val p = WaterProfile.from(mapOf(Field.CALCIO to 20.0, Field.MAGNESIO to 5.0, Field.BICARBONATO to 50.0))
        assertEquals(70.53, p.gh!!, 0.01)
        assertEquals(41.01, p.kh!!, 0.01)
        // Sem resíduo nem condutividade: soma dos íons, descontando o que o bicarbonato perde a 180 °C.
        assertEquals(TdsSource.IONS, p.tdsSource)
        assertEquals(20 + 5 + 50 * 0.4918, p.tds!!, 0.01)
    }

    @Test
    fun `agua equilibrada e excelente`() {
        val e = avaliar(
            Field.CALCIO to 22.0, Field.MAGNESIO to 6.0, Field.BICARBONATO to 55.0,
            Field.SODIO to 5.0, Field.PH to 7.1, Field.RESIDUO to 140.0,
        )
        assertEquals(Verdict.EXCELENTE, e.verdict)
        assertTrue(e.results.all { it.status == Status.IDEAL })
    }

    @Test
    fun `agua muito leve nao e recomendada e pede mineralizacao`() {
        val e = avaliar(
            Field.CALCIO to 1.5, Field.MAGNESIO to 0.6, Field.BICARBONATO to 8.0,
            Field.SODIO to 2.0, Field.PH to 5.4, Field.RESIDUO to 22.0,
        )
        assertTrue(e.score!! < 50)
        assertEquals(Verdict.RUIM, e.verdict)
        assertTrue(Improvements.precisaMineralizar(e.profile))
        assertNull(Improvements.melhorDiluicao(e.profile))
    }

    @Test
    fun `agua dura fica no maximo regular e sugere diluicao`() {
        val e = avaliar(
            Field.CALCIO to 70.0, Field.MAGNESIO to 20.0, Field.BICARBONATO to 260.0,
            Field.SODIO to 8.0, Field.PH to 7.6, Field.RESIDUO to 320.0,
        )
        assertTrue(e.score!! <= 69)
        val d = Improvements.melhorDiluicao(e.profile)
        assertNotNull(d)
        assertTrue(d!!.percentual in 15..40)
        assertTrue(d.nota >= 80)
    }

    @Test
    fun `mistura de duas aguas cadastradas`() {
        val leve = WaterLabel(
            "a", "Leve",
            values = mapOf(Field.CALCIO to 2.0, Field.MAGNESIO to 1.0, Field.BICARBONATO to 10.0, Field.RESIDUO to 30.0),
        )
        val dura = WaterLabel(
            "b", "Dura",
            values = mapOf(Field.CALCIO to 60.0, Field.MAGNESIO to 18.0, Field.BICARBONATO to 200.0, Field.RESIDUO to 280.0),
        )
        val p = WaterProfile.from(leve.values)
        val m = Improvements.melhorMistura(leve, p, listOf(leve, dura))
        assertNotNull(m)
        assertEquals("b", m!!.parceira!!.id)
        assertTrue(m.nota >= 80)
    }

    @Test
    fun `sem bicarbonato no rotulo estima pelo balanco de cargas`() {
        // Dias d'Ávila: cátions 0,910 meq/L, ânions 0,820 meq/L → ~5,5 mg/L de bicarbonato
        val p = WaterProfile.from(
            mapOf(
                Field.NITRATO to 18.0, Field.CLORETO to 15.19, Field.SODIO to 13.493, Field.SULFATO to 4.82,
                Field.CALCIO to 2.333, Field.MAGNESIO to 2.21, Field.POTASSIO to 0.971, Field.FLUORETO to 0.01,
            ),
        )
        assertEquals(5.5, p.kh!! / 0.8202, 0.3)
        assertTrue(p.avisos.any { "bicarbonato" in it })
        assertEquals(Verdict.RUIM, Evaluator.evaluate(p).verdict)
    }

    @Test
    fun `sem bicarbonato faltam dados`() {
        val e = avaliar(Field.CALCIO to 20.0, Field.MAGNESIO to 5.0)
        assertNull(e.score)
        assertEquals(Verdict.INSUFICIENTE, e.verdict)
    }

    @Test
    fun `medicao direta tem prioridade sobre o rotulo`() {
        val p = WaterProfile.from(
            mapOf(Field.CALCIO to 20.0, Field.MAGNESIO to 5.0, Field.GH to 90.0, Field.TDS to 130.0, Field.RESIDUO to 80.0),
        )
        assertEquals(90.0, p.gh!!, 0.0)
        assertEquals(130.0, p.tds!!, 0.0)
        assertEquals(TdsSource.MEDIDO, p.tdsSource)
    }
}
