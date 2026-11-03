package com.aguaprocafe.app.domain

import com.aguaprocafe.app.model.WaterLabel
import kotlin.math.roundToInt

/** [fracao] desta água + (1 - [fracao]) de [parceira] (null = água destilada / osmose reversa). */
data class Mistura(val fracao: Double, val parceira: WaterLabel?, val notaAntes: Int, val nota: Int) {
    val percentual get() = (fracao * 100).roundToInt()
}

object Improvements {
    private const val GANHO_MINIMO = 5

    fun melhorDiluicao(p: WaterProfile): Mistura? {
        val antes = base(p) ?: return null
        var melhor: Pair<Double, Double>? = null
        for (pct in 95 downTo 10 step 5) {
            val f = pct / 100.0
            val s = Evaluator.rawScore(p.mix(null, f)) ?: continue
            if (melhor == null || s > melhor.second + 0.01) melhor = f to s
        }
        val (f, s) = melhor ?: return null
        return Mistura(f, null, antes.roundToInt(), s.roundToInt())
            .takeIf { it.nota >= it.notaAntes + GANHO_MINIMO }
    }

    fun melhorMistura(self: WaterLabel, p: WaterProfile, outras: List<WaterLabel>): Mistura? {
        val antes = base(p) ?: return null
        var melhor: Mistura? = null
        for (outra in outras) {
            if (outra.id == self.id) continue
            val op = WaterProfile.from(outra.values)
            if (op.gh == null || op.kh == null) continue
            for (pct in 10..90 step 10) {
                val f = pct / 100.0
                val s = Evaluator.rawScore(p.mix(op, f))?.roundToInt() ?: continue
                if (melhor == null || s > melhor.nota) melhor = Mistura(f, outra, antes.roundToInt(), s)
            }
        }
        return melhor?.takeIf { it.nota >= it.notaAntes + GANHO_MINIMO && it.nota >= 70 }
    }

    /** Água leve demais: diluir não ajuda, precisa de mais minerais. */
    fun precisaMineralizar(p: WaterProfile): Boolean {
        val gh = p.gh ?: return false
        val kh = p.kh ?: return false
        return gh < Param.DUREZA.faixa.idealMin && kh < Param.ALCALINIDADE.faixa.idealMin
    }

    /** O pH não sobrevive à mistura, então a comparação é feita sem ele. */
    private fun base(p: WaterProfile) = Evaluator.rawScore(p.copy(ph = null))
}
