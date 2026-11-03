package com.aguaprocafe.app.domain

import com.aguaprocafe.app.model.Field

object Chemistry {
    /** mg/L do íon → mg/L como CaCO₃ */
    const val CA_CACO3 = 2.497
    const val MG_CACO3 = 4.118
    const val HCO3_CACO3 = 0.8202
    const val CO3_CACO3 = 1.6668

    /** Fator típico para converter condutividade (µS/cm) em TDS (mg/L). */
    const val TDS_POR_US = 0.65

    /** A 180 °C, 2 HCO₃⁻ → CO₃²⁻ + CO₂ + H₂O: só ~49% da massa do bicarbonato fica no resíduo. */
    const val HCO3_NO_RESIDUO = 0.4918

    /** mg/L por meq/L (massa molar ÷ carga) */
    private val equivalente = mapOf(
        Field.CALCIO to 20.04, Field.MAGNESIO to 12.15, Field.SODIO to 22.99, Field.POTASSIO to 39.10,
        Field.CLORETO to 35.45, Field.SULFATO to 48.03, Field.NITRATO to 62.00, Field.FLUORETO to 19.00,
    )
    private const val HCO3_EQUIVALENTE = 61.02

    /**
     * A água é eletricamente neutra: cátions = ânions (em meq/L). Quando o rótulo não traz o
     * bicarbonato, ele é praticamente a diferença. Exige os íons principais; K, NO₃ e F são pequenos.
     */
    fun bicarbonatoPorBalanco(v: Map<Field, Double>): Double? {
        val principais = listOf(Field.CALCIO, Field.MAGNESIO, Field.SODIO, Field.CLORETO, Field.SULFATO)
        if (principais.any { v[it] == null }) return null
        fun meq(vararg fs: Field) = fs.sumOf { (v[it] ?: 0.0) / equivalente.getValue(it) }
        val cations = meq(Field.CALCIO, Field.MAGNESIO, Field.SODIO, Field.POTASSIO)
        val anions = meq(Field.CLORETO, Field.SULFATO, Field.NITRATO, Field.FLUORETO)
        return ((cations - anions) * HCO3_EQUIVALENTE).coerceAtLeast(0.0)
    }
}

enum class TdsSource(val description: String) {
    MEDIDO("medido por você"),
    RESIDUO("resíduo de evaporação do rótulo"),
    CONDUTIVIDADE("estimado pela condutividade × 0,65"),
    IONS("estimado pela soma dos íons"),
    MISTURA("calculado para a mistura"),
}

/** O que importa para o café, já convertido. Dureza e alcalinidade em mg/L como CaCO₃. */
data class WaterProfile(
    val gh: Double?,
    val kh: Double?,
    val tds: Double?,
    val sodio: Double?,
    val cloreto: Double?,
    val sulfato: Double?,
    val ph: Double?,
    val calcio: Double? = null,
    val magnesio: Double? = null,
    val tdsSource: TdsSource? = null,
    val ghOrigem: String? = null,
    val khOrigem: String? = null,
    val avisos: List<String> = emptyList(),
) {
    /**
     * Mistura [fracao] desta água com (1 - fracao) de [outra]. Sem [outra], mistura com água
     * destilada / osmose reversa (zero minerais). O pH não mistura de forma linear, então some.
     */
    fun mix(outra: WaterProfile?, fracao: Double): WaterProfile {
        val o = outra ?: DESTILADA
        fun m(a: Double?, b: Double?) = if (a == null || b == null) null else a * fracao + b * (1 - fracao)
        return WaterProfile(
            gh = m(gh, o.gh),
            kh = m(kh, o.kh),
            tds = m(tds, o.tds),
            sodio = m(sodio, o.sodio),
            cloreto = m(cloreto, o.cloreto),
            sulfato = m(sulfato, o.sulfato),
            ph = null,
            calcio = m(calcio, o.calcio),
            magnesio = m(magnesio, o.magnesio),
            tdsSource = TdsSource.MISTURA,
            ghOrigem = "calculada para a mistura",
            khOrigem = "calculada para a mistura",
        )
    }

    companion object {
        val DESTILADA = WaterProfile(
            gh = 0.0, kh = 0.0, tds = 0.0, sodio = 0.0, cloreto = 0.0, sulfato = 0.0, ph = null,
            calcio = 0.0, magnesio = 0.0,
        )

        fun from(v: Map<Field, Double>): WaterProfile {
            val avisos = mutableListOf<String>()
            val ca = v[Field.CALCIO]
            val mg = v[Field.MAGNESIO]
            val co3 = v[Field.CARBONATO]
            val hco3Estimado = if (v[Field.BICARBONATO] == null && co3 == null && v[Field.KH] == null) {
                Chemistry.bicarbonatoPorBalanco(v)
            } else {
                null
            }
            val hco3 = v[Field.BICARBONATO] ?: hco3Estimado

            val gh: Double?
            val ghOrigem: String?
            when {
                v[Field.GH] != null -> {
                    gh = v[Field.GH]
                    ghOrigem = "medida por você"
                }
                ca != null || mg != null -> {
                    gh = (ca ?: 0.0) * Chemistry.CA_CACO3 + (mg ?: 0.0) * Chemistry.MG_CACO3
                    ghOrigem = "Ca ${fmt(ca ?: 0.0)} × 2,497 + Mg ${fmt(mg ?: 0.0)} × 4,118"
                    if (ca == null) avisos += "Cálcio não informado: considerei 0 na dureza."
                    if (mg == null) avisos += "Magnésio não informado: considerei 0 na dureza."
                }
                else -> {
                    gh = null
                    ghOrigem = null
                }
            }

            val kh: Double?
            val khOrigem: String?
            when {
                v[Field.KH] != null -> {
                    kh = v[Field.KH]
                    khOrigem = "medida por você"
                }
                hco3 != null || co3 != null -> {
                    kh = (hco3 ?: 0.0) * Chemistry.HCO3_CACO3 + (co3 ?: 0.0) * Chemistry.CO3_CACO3
                    khOrigem = buildString {
                        if (hco3Estimado != null) {
                            append("Bicarbonato estimado em ${fmt(hco3Estimado, 1)} × 0,82 (o rótulo não informa)")
                        } else if (hco3 != null) {
                            append("Bicarbonato ${fmt(hco3)} × 0,82")
                        }
                        if (hco3 != null && co3 != null && co3 > 0) append(" + ")
                        if (co3 != null && co3 > 0) append("Carbonato ${fmt(co3)} × 1,67")
                    }
                }
                else -> {
                    kh = null
                    khOrigem = null
                }
            }

            val ions = listOf(
                Field.CARBONATO, Field.CALCIO, Field.MAGNESIO, Field.SODIO,
                Field.POTASSIO, Field.SULFATO, Field.CLORETO, Field.NITRATO, Field.FLUORETO,
            )
            val (tds, tdsSource) = when {
                v[Field.TDS] != null -> v[Field.TDS] to TdsSource.MEDIDO
                v[Field.RESIDUO] != null -> v[Field.RESIDUO] to TdsSource.RESIDUO
                v[Field.CONDUTIVIDADE] != null ->
                    v.getValue(Field.CONDUTIVIDADE) * Chemistry.TDS_POR_US to TdsSource.CONDUTIVIDADE
                ca != null && mg != null && hco3 != null -> {
                    val soma = ions.sumOf { v[it] ?: 0.0 } + hco3 * Chemistry.HCO3_NO_RESIDUO
                    soma to TdsSource.IONS
                }
                else -> null to null
            }

            if (hco3Estimado != null) {
                avisos += "O rótulo não informa bicarbonato. Estimei ~${fmt(hco3Estimado, 1)} mg/L pelo equilíbrio " +
                    "entre cátions e ânions; se tiver o valor real, preencha que fica mais preciso."
            }

            return WaterProfile(
                gh = gh,
                kh = kh,
                tds = tds,
                sodio = v[Field.SODIO],
                cloreto = v[Field.CLORETO],
                sulfato = v[Field.SULFATO],
                ph = v[Field.PH],
                calcio = ca,
                magnesio = mg,
                tdsSource = tdsSource,
                ghOrigem = ghOrigem,
                khOrigem = khOrigem,
                avisos = avisos,
            )
        }
    }
}
