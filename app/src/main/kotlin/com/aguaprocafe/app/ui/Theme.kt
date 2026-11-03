@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)

package com.aguaprocafe.app.ui

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ListItemColors
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.MotionScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import com.aguaprocafe.app.domain.Status
import com.aguaprocafe.app.domain.Verdict

/** Paleta café, usada só em Android < 12 (sem cores dinâmicas). */
private val Light = lightColorScheme(
    primary = Color(0xFF6B4226),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFF2DED0),
    onPrimaryContainer = Color(0xFF2A1607),
    secondary = Color(0xFF2E6E8E),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD5EAF5),
    onSecondaryContainer = Color(0xFF0A2938),
    tertiary = Color(0xFF5E6B3A),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFE2EBC4),
    onTertiaryContainer = Color(0xFF1B2108),
    background = Color(0xFFFBF8F5),
    onBackground = Color(0xFF1F1B18),
    surface = Color(0xFFFBF8F5),
    onSurface = Color(0xFF1F1B18),
    surfaceVariant = Color(0xFFEFE6DE),
    onSurfaceVariant = Color(0xFF5A4C42),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFF6F1EC),
    surfaceContainer = Color(0xFFF1EBE5),
    surfaceContainerHigh = Color(0xFFEBE4DE),
    surfaceContainerHighest = Color(0xFFE5DED7),
    outline = Color(0xFF84756A),
    outlineVariant = Color(0xFFD9CCC1),
)

private val Dark = darkColorScheme(
    primary = Color(0xFFE3BFA3),
    onPrimary = Color(0xFF3F2414),
    primaryContainer = Color(0xFF573623),
    onPrimaryContainer = Color(0xFFF8E2D2),
    secondary = Color(0xFF9DCDE8),
    onSecondary = Color(0xFF00344B),
    secondaryContainer = Color(0xFF184D67),
    onSecondaryContainer = Color(0xFFD5EAF5),
    tertiary = Color(0xFFC6D19F),
    onTertiary = Color(0xFF2F3713),
    tertiaryContainer = Color(0xFF454F27),
    onTertiaryContainer = Color(0xFFE2EBC4),
    background = Color(0xFF17130F),
    onBackground = Color(0xFFEDE3DB),
    surface = Color(0xFF17130F),
    onSurface = Color(0xFFEDE3DB),
    surfaceVariant = Color(0xFF4A3F37),
    onSurfaceVariant = Color(0xFFD3C4B8),
    surfaceContainerLowest = Color(0xFF110E0B),
    surfaceContainerLow = Color(0xFF1F1B17),
    surfaceContainer = Color(0xFF241F1B),
    surfaceContainerHigh = Color(0xFF2E2925),
    surfaceContainerHighest = Color(0xFF39332F),
    outline = Color(0xFF9C8E83),
    outlineVariant = Color(0xFF4E443C),
)

@Immutable
data class StatusColors(val ideal: Color, val atencao: Color, val ruim: Color, val neutro: Color) {
    fun of(s: Status) = when (s) {
        Status.IDEAL -> ideal
        Status.BAIXO, Status.ALTO -> atencao
        Status.MUITO_BAIXO, Status.MUITO_ALTO -> ruim
    }

    fun of(v: Verdict) = when (v) {
        Verdict.EXCELENTE, Verdict.BOA -> ideal
        Verdict.REGULAR -> atencao
        Verdict.RUIM -> ruim
        Verdict.INSUFICIENTE -> neutro
    }
}

private val LightStatus = StatusColors(Color(0xFF2F7D4F), Color(0xFFB0741A), Color(0xFFB4442F), Color(0xFF84756A))
private val DarkStatus = StatusColors(Color(0xFF7BCB98), Color(0xFFE6B45C), Color(0xFFF08C78), Color(0xFF9C8E83))

val LocalStatusColors = staticCompositionLocalOf { LightStatus }

/**
 * Fundo da tela e dos cartões como nas Configurações do Android: o cartão fica sempre um pouco
 * mais claro que o fundo (no claro, branco sobre cinza; no escuro, cinza sobre quase preto).
 */
@Immutable
data class Superficies(val tela: Color, val item: Color) {
    companion object {
        fun de(c: ColorScheme, dark: Boolean) =
            if (dark) Superficies(tela = c.surfaceContainerLowest, item = c.surfaceContainer)
            else Superficies(tela = c.surfaceContainer, item = c.surfaceBright)
    }
}

val LocalSuperficies = staticCompositionLocalOf { Superficies(Color.Unspecified, Color.Unspecified) }

@Composable
fun itemColors(): ListItemColors = ListItemDefaults.segmentedColors(containerColor = LocalSuperficies.current.item)

/**
 * Material 3 Expressive com as cores do papel de parede (Material You / paleta do Galaxy),
 * igual aos apps do Google. Em Android < 12 cai na paleta café.
 */
@Composable
fun BrewaterTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val context = LocalContext.current
    val scheme = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        dark -> Dark
        else -> Light
    }
    CompositionLocalProvider(
        LocalStatusColors provides if (dark) DarkStatus else LightStatus,
        LocalSuperficies provides Superficies.de(scheme, dark),
    ) {
        MaterialExpressiveTheme(colorScheme = scheme, motionScheme = MotionScheme.expressive(), content = content)
    }
}
