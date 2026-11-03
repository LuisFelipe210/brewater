package com.aguaprocafe.app.model

/** Campos que aparecem no rótulo de água mineral brasileira (ou medidos por você). */
enum class Field(val label: String, val unit: String, val group: Group) {
    BICARBONATO("Bicarbonato", "mg/L", Group.IONS),
    CALCIO("Cálcio", "mg/L", Group.IONS),
    MAGNESIO("Magnésio", "mg/L", Group.IONS),
    SODIO("Sódio", "mg/L", Group.IONS),
    POTASSIO("Potássio", "mg/L", Group.IONS),
    SULFATO("Sulfato", "mg/L", Group.IONS),
    CLORETO("Cloreto", "mg/L", Group.IONS),
    NITRATO("Nitrato", "mg/L", Group.IONS),
    FLUORETO("Fluoreto", "mg/L", Group.IONS),
    CARBONATO("Carbonato", "mg/L", Group.IONS),
    PH("pH a 25 °C", "", Group.FISICO),
    CONDUTIVIDADE("Condutividade", "µS/cm", Group.FISICO),
    RESIDUO("Resíduo a 180 °C", "mg/L", Group.FISICO),
    GH("Dureza (GH)", "mg/L CaCO₃", Group.MEDIDO),
    KH("Alcalinidade (KH)", "mg/L CaCO₃", Group.MEDIDO),
    TDS("TDS (medidor)", "ppm", Group.MEDIDO);

    enum class Group(val title: String, val hint: String?) {
        IONS("Composição química", "Valores em mg/L, como no rótulo"),
        FISICO("Características físico-químicas", null),
        MEDIDO(
            "Medições diretas (opcional)",
            "Se você mediu com kit ou medidor de TDS, esses valores têm prioridade sobre o rótulo",
        ),
    }
}

data class WaterLabel(
    val id: String,
    val brand: String,
    val source: String = "",
    val notes: String = "",
    val values: Map<Field, Double> = emptyMap(),
    val photoPath: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
)
