@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)

package com.aguaprocafe.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularWavyProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialShapes
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.toShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.aguaprocafe.app.data.Images
import com.aguaprocafe.app.domain.Param
import com.aguaprocafe.app.domain.Status
import java.io.File
import kotlin.math.max

/** Nota num anel ondulado (Material 3 Expressive) que enche ao abrir a tela. */
@Composable
fun ScoreDial(score: Int?, color: Color, modifier: Modifier = Modifier, size: Dp = 148.dp) {
    val progress = remember { Animatable(0f) }
    LaunchedEffect(score) { progress.animateTo((score ?: 0) / 100f) }
    val stroke = with(LocalDensity.current) { Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round) }
    Box(modifier.size(size), contentAlignment = Alignment.Center) {
        CircularWavyProgressIndicator(
            progress = { progress.value },
            modifier = Modifier.fillMaxSize(),
            color = color,
            trackColor = color.copy(alpha = 0.18f),
            stroke = stroke,
            trackStroke = stroke,
            wavelength = 34.dp,
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                score?.toString() ?: "–",
                style = MaterialTheme.typography.displayMediumEmphasized,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text("de 100", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Nota num "cookie" de 9 lados, como os ícones de destaque dos apps do Google. */
@Composable
fun ScoreBadge(score: Int?, color: Color, modifier: Modifier = Modifier, size: Dp = 52.dp) {
    Box(
        modifier
            .size(size)
            .clip(MaterialShapes.Cookie9Sided.toShape())
            .background(color.copy(alpha = 0.18f)),
        contentAlignment = Alignment.Center,
    ) {
        Text(score?.toString() ?: "?", style = MaterialTheme.typography.titleMediumEmphasized, color = color)
    }
}

@Composable
fun StatusPill(status: Status, modifier: Modifier = Modifier) {
    val c = LocalStatusColors.current.of(status)
    Text(
        status.label,
        modifier
            .clip(RoundedCornerShape(50))
            .background(c.copy(alpha = 0.16f))
            .padding(horizontal = 12.dp, vertical = 4.dp),
        style = MaterialTheme.typography.labelLargeEmphasized,
        color = c,
    )
}

/** Régua do parâmetro: faixa aceitável (clara), faixa ideal (forte) e o marcador do valor. */
@Composable
fun RangeBar(param: Param, value: Double, modifier: Modifier = Modifier) {
    val colors = LocalStatusColors.current
    val marker = colors.of(param.faixa.status(value))
    val track = MaterialTheme.colorScheme.surfaceContainerHighest
    val ring = LocalSuperficies.current.item
    val f = param.faixa
    val min = if (param == Param.PH) minOf(4.0, value) else 0.0
    val maxV = max(f.okMax * 1.3, value * 1.08)

    Canvas(modifier.fillMaxWidth().height(24.dp)) {
        fun x(v: Double) = ((v - min) / (maxV - min)).toFloat().coerceIn(0f, 1f) * size.width
        val h = 10.dp.toPx()
        val y = (size.height - h) / 2
        val r = CornerRadius(h / 2)
        drawRoundRect(track, Offset(0f, y), Size(size.width, h), r)
        drawRoundRect(colors.atencao.copy(alpha = 0.35f), Offset(x(f.okMin), y), Size(x(f.okMax) - x(f.okMin), h), r)
        drawRoundRect(colors.ideal.copy(alpha = 0.8f), Offset(x(f.idealMin), y), Size(x(f.idealMax) - x(f.idealMin), h), r)
        val cx = x(value).coerceIn(12.dp.toPx(), size.width - 12.dp.toPx())
        drawCircle(ring, radius = 12.dp.toPx(), center = Offset(cx, size.height / 2))
        drawCircle(marker, radius = 8.dp.toPx(), center = Offset(cx, size.height / 2))
    }
}

@Composable
fun PhotoImage(path: String, modifier: Modifier = Modifier, maxDim: Int = 1400) {
    val bitmap by produceState<ImageBitmap?>(null, path) {
        value = Images.decode(File(path), maxDim)?.asImageBitmap()
    }
    Box(modifier.background(MaterialTheme.colorScheme.surfaceContainerHigh)) {
        bitmap?.let {
            Image(it, contentDescription = "Foto do rótulo", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        }
    }
}

/** Cabeçalho de grupo no estilo das Configurações do Android. */
@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier, hint: String? = null) {
    Column(modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 8.dp)) {
        Text(text, style = MaterialTheme.typography.titleSmallEmphasized, color = MaterialTheme.colorScheme.primary)
        if (hint != null) {
            Text(hint, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Forma de um item dentro de um grupo: cantos grandes só nas pontas do grupo. */
@Composable
fun segmentShape(index: Int, count: Int): Shape = ListItemDefaults.segmentedShapes(index, count).shape

/** Bloco de um grupo segmentado, para conteúdos mais ricos que um ListItem. */
@Composable
fun Segment(
    index: Int,
    count: Int,
    modifier: Modifier = Modifier,
    color: Color = LocalSuperficies.current.item,
    contentPadding: PaddingValues = PaddingValues(20.dp),
    content: @Composable () -> Unit,
) {
    Surface(
        shape = segmentShape(index, count),
        color = color,
        modifier = modifier.fillMaxWidth().padding(top = if (index > 0) ListItemDefaults.SegmentedGap else 0.dp),
    ) {
        Box(Modifier.padding(contentPadding)) { content() }
    }
}
