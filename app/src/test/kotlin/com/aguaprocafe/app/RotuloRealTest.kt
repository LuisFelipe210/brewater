package com.aguaprocafe.app

import com.aguaprocafe.app.model.Field
import com.aguaprocafe.app.ocr.LabelParser
import com.aguaprocafe.app.ocr.OcrLine
import com.aguaprocafe.app.ocr.OcrWord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Saída real do ML Kit para fotos de rótulos tiradas no celular. */
class RotuloRealTest {

    /**
     * Petrópolis, garrafa curva, tabela em 4 colunas (nome, valor, nome, valor).
     * O OCR leu "Sufato", "Macnésio", "O,956", "0477" e separou "Sódio" do "6.652".
     */
    @Test
    fun petropolis() {
        val r = LabelParser.parse(PETROPOLIS)
        val v = r.values
        assertEquals(11.37, v[Field.CLORETO]!!, 1e-6)
        assertEquals(6.652, v[Field.SODIO]!!, 1e-6)
        assertEquals(2.22, v[Field.SULFATO]!!, 1e-6)
        assertEquals(1.96, v[Field.BICARBONATO]!!, 1e-6)
        assertEquals(0.956, v[Field.MAGNESIO]!!, 1e-6)
        assertEquals(0.477, v[Field.CALCIO]!!, 1e-6)
        // No rótulo é 1,225; o OCR leu "1,25"
        assertEquals(1.25, v[Field.POTASSIO]!!, 1e-6)
        // "1,06" virou "106": acima do limite legal de nitrato, melhor deixar em branco
        assertNull(v[Field.NITRATO])
        // O resíduo está cortado na foto: não pode pegar o "12" de "12 meses"
        assertNull(v[Field.RESIDUO])
    }

    /** Dias d'Ávila: tabela simples em duas colunas, sem bicarbonato no rótulo. */
    @Test
    fun diasDavila() {
        val r = LabelParser.parse(DAVILA)
        val esperado = mapOf(
            Field.NITRATO to 18.0, Field.CLORETO to 15.19, Field.SODIO to 13.493, Field.SULFATO to 4.82,
            Field.CALCIO to 2.333, Field.MAGNESIO to 2.21, Field.POTASSIO to 0.971, Field.FLUORETO to 0.01,
        )
        assertEquals(esperado, r.values)
        assertEquals("SENHOR DO BONFIM - DIAS D'ÂVILA/BA", r.source)
    }

    private companion object {
        val PETROPOLIS = listOf(
        OcrLine(
            "OUS", 461, 1967, 740, 2169,
            listOf(
                OcrWord("OUS", 461, 1967, 740, 2169),
            ),
        ),
        OcrLine(
            "COMPOSIÇÃO", 1081, 1512, 1637, 1658,
            listOf(
                OcrWord("COMPOSIÇÃO", 1081, 1512, 1637, 1658),
            ),
        ),
        OcrLine(
            "QUMICA (mg", 1066, 1654, 1693, 1780,
            listOf(
                OcrWord("QUMICA", 1066, 1657, 1404, 1780),
                OcrWord("(mg", 1424, 1654, 1693, 1775),
            ),
        ),
        OcrLine(
            "Cloreto 11,37 Potássio", 853, 1815, 1707, 1949,
            listOf(
                OcrWord("Cloreto", 855, 1843, 1062, 1936),
                OcrWord("11,37", 1235, 1829, 1383, 1939),
                OcrWord("Potássio", 1455, 1814, 1707, 1929),
            ),
        ),
        OcrLine(
            "Sódio", 854, 1988, 1057, 2073,
            listOf(
                OcrWord("Sódio", 854, 1988, 1057, 2073),
            ),
        ),
        OcrLine(
            "Sufato", 901, 2131, 1071, 2222,
            listOf(
                OcrWord("Sufato", 901, 2131, 1071, 2222),
            ),
        ),
        OcrLine(
            "6.652 Nitrato", 1187, 1972, 1660, 2069,
            listOf(
                OcrWord("6.652", 1187, 1972, 1437, 2069),
                OcrWord("Nitrato", 1453, 1972, 1660, 2069),
            ),
        ),
        OcrLine(
            "Clasiiacá", 2044, 1499, 2296, 1603,
            listOf(
                OcrWord("Clasiiacá", 2044, 1499, 2296, 1603),
            ),
        ),
        OcrLine(
            "Caracteristica", 2015, 1599, 2389, 1697,
            listOf(
                OcrWord("Caracteristica", 2015, 1599, 2389, 1697),
            ),
        ),
        OcrLine(
            "água na tone", 2036, 1693, 2313, 1814,
            listOf(
                OcrWord("água", 2036, 1708, 2160, 1814),
                OcrWord("na", 2157, 1702, 2221, 1802),
                OcrWord("tone", 2225, 1693, 2313, 1796),
            ),
        ),
        OcrLine(
            "1,25-Řesiduoeas", 1773, 1784, 2403, 1915,
            listOf(
                OcrWord("1,25-Řesiduoeas", 1773, 1784, 2403, 1915),
            ),
        ),
        OcrLine(
            "106 12 meses li", 1809, 1886, 2334, 2057,
            listOf(
                OcrWord("106", 1809, 1952, 1934, 2057),
                OcrWord("12", 2023, 1925, 2097, 2021),
                OcrWord("meses", 2120, 1893, 2284, 2005),
                OcrWord("li", 2293, 1886, 2334, 1976),
            ),
        ),
        OcrLine(
            "2.22 Macnésio O,956 ransniant", 1249, 2079, 2418, 2216,
            listOf(
                OcrWord("2.22", 1249, 2120, 1387, 2216),
                OcrWord("Macnésio", 1408, 2105, 1747, 2209),
                OcrWord("O,956", 1775, 2098, 1929, 2195),
                OcrWord("ransniant", 2024, 2078, 2417, 2185),
            ),
        ),
        OcrLine(
            "Bicarbonato 1,96 Cálcio 0477 Solar NAOCOD", 886, 2101, 2423, 2459,
            listOf(
                OcrWord("Bicarbonato", 897, 2271, 1254, 2373),
                OcrWord("1,96", 1290, 2259, 1400, 2369),
                OcrWord("Cálcio", 1472, 2249, 1657, 2362),
                OcrWord("0477", 1815, 2236, 1949, 2347),
                OcrWord("Solar", 2029, 2198, 2181, 2315),
                OcrWord("NAOCOD", 2190, 2133, 2415, 2270),
            ),
        ),
        OcrLine(
            "ATENDIMENT AO CORsuMDOR", 1124, 2443, 2239, 2663,
            listOf(
                OcrWord("ATENDIMENT", 1124, 2499, 1676, 2663),
                OcrWord("AO", 1686, 2486, 1804, 2607),
                OcrWord("CORsuMDOR", 1819, 2443, 2239, 2594),
            ),
        ),
        OcrLine(
            "SAC- 0800 215 5976", 1368, 2587, 2085, 2763,
            listOf(
                OcrWord("SAC-", 1368, 2638, 1597, 2763),
                OcrWord("0800", 1640, 2616, 1813, 2734),
                OcrWord("215", 1820, 2604, 1922, 2716),
                OcrWord("5976", 1952, 2587, 2085, 2702),
            ),
        ),
        )

        val DAVILA = listOf(
        OcrLine(
            "8", 45, 1753, 210, 2085,
            listOf(
                OcrWord("8", 45, 1753, 210, 2085),
            ),
        ),
        OcrLine(
            "DIBALAGEM", 233, 1241, 541, 1322,
            listOf(
                OcrWord("DIBALAGEM", 233, 1241, 541, 1322),
            ),
        ),
        OcrLine(
            "ECOLOGICAE", 234, 1332, 541, 1404,
            listOf(
                OcrWord("ECOLOGICAE", 234, 1332, 541, 1404),
            ),
        ),
        OcrLine(
            "BECICLAVEL", 233, 1608, 560, 1702,
            listOf(
                OcrWord("BECICLAVEL", 233, 1608, 560, 1702),
            ),
        ),
        OcrLine(
            "ila", 51, 2177, 745, 2775,
            listOf(
                OcrWord("ila", 51, 2177, 745, 2775),
            ),
        ),
        OcrLine(
            "etural", 341, 2930, 723, 3143,
            listOf(
                OcrWord("etural", 341, 2930, 723, 3143),
            ),
        ),
        OcrLine(
            "Sem gas", 245, 3129, 715, 3421,
            listOf(
                OcrWord("Sem", 246, 3130, 490, 3325),
                OcrWord("gas", 459, 3220, 716, 3421),
            ),
        ),
        OcrLine(
            "| COMPOSIÇÃO QUÍMICA (mg/L)", 979, 1272, 1983, 1419,
            listOf(
                OcrWord("|", 979, 1273, 1018, 1398),
                OcrWord("COMPOSIÇÃO", 1020, 1273, 1445, 1408),
                OcrWord("QUÍMICA", 1457, 1282, 1733, 1413),
                OcrWord("(mg/L)", 1754, 1289, 1983, 1419),
            ),
        ),
        OcrLine(
            "Nitrato", 1081, 1639, 1323, 1713,
            listOf(
                OcrWord("Nitrato", 1081, 1639, 1323, 1713),
            ),
        ),
        OcrLine(
            "Cloreto", 1081, 1725, 1340, 1810,
            listOf(
                OcrWord("Cloreto", 1081, 1725, 1340, 1810),
            ),
        ),
        OcrLine(
            "Sódio", 1081, 1804, 1303, 1893,
            listOf(
                OcrWord("Sódio", 1081, 1804, 1303, 1893),
            ),
        ),
        OcrLine(
            "Sulfato", 1081, 1898, 1336, 1988,
            listOf(
                OcrWord("Sulfato", 1081, 1898, 1336, 1988),
            ),
        ),
        OcrLine(
            "Cálcio", 1081, 1987, 1311, 2066,
            listOf(
                OcrWord("Cálcio", 1081, 1987, 1311, 2066),
            ),
        ),
        OcrLine(
            "Magnésio", 1082, 2075, 1449, 2170,
            listOf(
                OcrWord("Magnésio", 1082, 2075, 1449, 2170),
            ),
        ),
        OcrLine(
            "Potássio", 1078, 2152, 1385, 2241,
            listOf(
                OcrWord("Potássio", 1078, 2152, 1385, 2241),
            ),
        ),
        OcrLine(
            "Fosfato", 1078, 2241, 1345, 2321,
            listOf(
                OcrWord("Fosfato", 1078, 2241, 1345, 2321),
            ),
        ),
        OcrLine(
            "Brometo", 1083, 2328, 1391, 2407,
            listOf(
                OcrWord("Brometo", 1083, 2328, 1391, 2407),
            ),
        ),
        OcrLine(
            "18.00", 1737, 1647, 1913, 1722,
            listOf(
                OcrWord("18.00", 1737, 1647, 1913, 1722),
            ),
        ),
        OcrLine(
            "Bário", 1081, 2492, 1264, 2570,
            listOf(
                OcrWord("Bário", 1081, 2492, 1264, 2570),
            ),
        ),
        OcrLine(
            "Fluoreto", 1081, 2573, 1374, 2648,
            listOf(
                OcrWord("Fluoreto", 1081, 2573, 1374, 2648),
            ),
        ),
        OcrLine(
            "15,19", 1732, 1729, 1915, 1815,
            listOf(
                OcrWord("15,19", 1732, 1729, 1915, 1815),
            ),
        ),
        OcrLine(
            "13,493", 1682, 1816, 1913, 1910,
            listOf(
                OcrWord("13,493", 1682, 1816, 1913, 1910),
            ),
        ),
        OcrLine(
            "4,82", 1765, 1896, 1912, 1982,
            listOf(
                OcrWord("4,82", 1765, 1896, 1912, 1982),
            ),
        ),
        OcrLine(
            "2,333", 1717, 1979, 1909, 2073,
            listOf(
                OcrWord("2,333", 1717, 1979, 1909, 2073),
            ),
        ),
        OcrLine(
            "2.210", 1712, 2068, 1909, 2158,
            listOf(
                OcrWord("2.210", 1712, 2068, 1909, 2158),
            ),
        ),
        OcrLine(
            "0,971", 1725, 2149, 1908, 2234,
            listOf(
                OcrWord("0,971", 1725, 2149, 1908, 2234),
            ),
        ),
        OcrLine(
            "<0,12", 1712, 2223, 1903, 2320,
            listOf(
                OcrWord("<0,12", 1712, 2223, 1903, 2320),
            ),
        ),
        OcrLine(
            "0,05", 1753, 2310, 1898, 2395,
            listOf(
                OcrWord("0,05", 1753, 2310, 1898, 2395),
            ),
        ),
        OcrLine(
            "Estrôncio0.033", 1109, 2391, 1891, 2490,
            listOf(
                OcrWord("Estrôncio0.033", 1109, 2391, 1891, 2490),
            ),
        ),
        OcrLine(
            "O010", 1695, 2471, 1893, 2553,
            listOf(
                OcrWord("O010", 1695, 2471, 1893, 2553),
            ),
        ),
        OcrLine(
            "0.01", 1748, 2542, 1894, 2631,
            listOf(
                OcrWord("0.01", 1748, 2542, 1894, 2631),
            ),
        ),
        OcrLine(
            "PRESERVEA NATUREZA, PRATIQUE", 1045, 2853, 1916, 3010,
            listOf(
                OcrWord("PRESERVEA", 1049, 2904, 1379, 2984),
                OcrWord("NATUREZA,", 1397, 2904, 1689, 2984),
                OcrWord("PRATIQUE", 1711, 2853, 1914, 2964),
            ),
        ),
        OcrLine(
            "RECICLAGEM, JOGUE 0LIXO NO LIXO,", 1035, 2912, 1915, 3120,
            listOf(
                OcrWord("RECICLAGEM,", 1041, 2991, 1366, 3067),
                OcrWord("JOGUE", 1388, 2998, 1540, 3071),
                OcrWord("0LIXO", 1583, 2971, 1731, 3070),
                OcrWord("NO", 1733, 2961, 1789, 3045),
                OcrWord("LIXO,", 1801, 2941, 1913, 3035),
            ),
        ),
        OcrLine(
            "PLASTICO", 1488, 3343, 1763, 3460,
            listOf(
                OcrWord("PLASTICO", 1488, 3343, 1763, 3460),
            ),
        ),
        OcrLine(
            "FONTE SENHOR D0 BONFIM - DIAS D'ÂVILA/BA.", 1985, 1478, 2082, 2651,
            listOf(
                OcrWord("FONTE", 1985, 2498, 2047, 2651),
                OcrWord("SENHOR", 1991, 2279, 2054, 2477),
                OcrWord("D0", 1998, 2187, 2057, 2264),
                OcrWord("BONFIM", 2002, 1972, 2064, 2170),
                OcrWord("-", 2009, 1935, 2065, 1952),
                OcrWord("DIAS", 2011, 1795, 2070, 1906),
                OcrWord("D'ÂVILA/BA.", 2016, 1479, 2082, 1757),
            ),
        ),
        )
    }
}
