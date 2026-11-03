package com.aguaprocafe.app.domain

import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

private val ptBR = DecimalFormatSymbols(Locale.forLanguageTag("pt-BR"))

/** 1234.5 → "1234,5"; até [casas] decimais, sem zeros sobrando. */
fun fmt(v: Double, casas: Int = 2): String =
    DecimalFormat(if (casas <= 0) "0" else "0." + "#".repeat(casas), ptBR)
        .apply { roundingMode = RoundingMode.HALF_UP }
        .format(v)

/** Aceita "8,35", "8.35", " 8 " e devolve null para texto inválido ou vazio. */
fun parseNumber(s: String): Double? = s.trim().replace(',', '.').toDoubleOrNull()
