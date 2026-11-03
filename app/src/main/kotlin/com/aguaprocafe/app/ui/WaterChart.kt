@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)

package com.aguaprocafe.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp
import com.aguaprocafe.app.domain.Param
import com.aguaprocafe.app.domain.Verdict
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.pow

/*
 * O gráfico de água da SCA, igual ao do iPhone: dureza (GH) no eixo x, alcalinidade (KH) no y,
 * em mg/L de CaCO₃. A zona ideal sai das mesmas faixas que dão a nota. Fica sempre sobre o
 * espresso, que é a marca do app nas duas plataformas, independente das cores do papel de parede.
 */

data class ChartPoint(val id: String, val gh: Double, val kh: Double, val verdict: Verdict)

/** Onde a água vai parar depois da correção, e com qual veredito. */
data class ChartRoute(val toGh: Double, val toKh: Double, val verdict: Verdict, val viaGh: Double? = null, val viaKh: Double? = null)

object ChartColors {
    val espresso = Color(0xFF1E120C)
    val onEspresso = Color(0xFFF3F5F2)
    val crema = Color(0xFFE9B98F)
    val zone = Color(0xFF2BB3BD)
    val zoneText = Color(0xFFA6EDF1)

    fun of(v: Verdict) = when (v) {
        Verdict.EXCELENTE -> Color(0xFF3CC872)
        Verdict.BOA -> Color(0xFFA3D24E)
        Verdict.REGULAR -> Color(0xFFF2B33D)
        Verdict.RUIM -> Color(0xFFF0644A)
        Verdict.INSUFICIENTE -> Color(0xFFA8A29E)
    }
}

private const val W = 340f
private const val MAX_GH = 200.0
private const val MAX_KH = 120.0

/** Raio de toque em unidades do gráfico (~48dp de alvo na largura de um celular) */
private const val TOQUE = 26f

private val easeOutQuart = CubicBezierEasing(0.25f, 1f, 0.5f, 1f)

@Composable
fun WaterChart(
    points: List<ChartPoint>,
    description: String,
    modifier: Modifier = Modifier,
    focus: String? = null,
    route: ChartRoute? = null,
    compact: Boolean = false,
    onSelect: ((String) -> Unit)? = null,
) {
    val h = if (compact) 136f else 220f
    val padL = if (compact) 12f else 32f
    val padR = 12f
    val padT = 24f
    val padB = 30f
    val measurer = rememberTextMeasurer()
    val pxPerSp = LocalContext.current.resources.displayMetrics.scaledDensity

    // A rota anda uma vez: o ponto da água corrigida desliza até o destino e chega com a nova cor
    val t = remember(route) { Animatable(if (route == null) 1f else 0f) }
    LaunchedEffect(route) {
        if (route != null) t.animateTo(1f, tween(durationMillis = 1100, delayMillis = 350, easing = easeOutQuart))
    }

    fun x(gh: Double) = padL + (min(gh, MAX_GH * 0.98) / MAX_GH).toFloat() * (W - padL - padR)
    fun y(kh: Double) = h - padB - (min(kh, MAX_KH * 0.96) / MAX_KH).toFloat() * (h - padT - padB)
    fun fora(p: ChartPoint) = p.gh > MAX_GH || p.kh > MAX_KH

    val tap = if (onSelect == null) Modifier else Modifier.pointerInput(points) {
        detectTapGestures { o ->
            val s = size.width / W
            val px = o.x / s
            val py = o.y / s
            points
                .map { it to hypot(x(it.gh) - px, y(it.kh) - py) }
                .filter { it.second < TOQUE }
                .minByOrNull { it.second }
                ?.let { onSelect(it.first.id) }
        }
    }

    Canvas(
        modifier
            .fillMaxWidth()
            .aspectRatio(W / h)
            .then(tap)
            .semantics { contentDescription = description },
    ) {
        val s = size.width / W
        fun o(vx: Float, vy: Float) = Offset(vx * s, vy * s)

        // Texto em unidades do gráfico: 11 unidades viram ~11sp na largura de um celular
        fun texto(str: String, vx: Float, vy: Float, cor: Color, tam: Float = 11f, bold: Boolean = false, ancora: Float = 0f) {
            val layout = measurer.measure(
                str,
                TextStyle(color = cor, fontSize = (tam * s / pxPerSp).sp, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal),
            )
            drawText(layout, topLeft = Offset(vx * s - layout.size.width * ancora, vy * s - layout.size.height * 0.78f))
        }

        val grade = ChartColors.onEspresso.copy(alpha = 0.09f)
        val eixo = ChartColors.onEspresso.copy(alpha = 0.4f)
        val rotulo = ChartColors.onEspresso.copy(alpha = 0.62f)

        listOf(0.0, 50.0, 100.0, 150.0, 200.0).forEach { g ->
            drawLine(grade, o(x(g), padT), o(x(g), h - padB), strokeWidth = 1f)
            if (!compact) texto(fmtInt(g), x(g), h - 12f, rotulo, ancora = 0.5f)
        }
        (if (compact) listOf(0.0, 60.0, 120.0) else listOf(0.0, 20.0, 40.0, 60.0, 80.0, 100.0, 120.0)).forEach { k ->
            drawLine(grade, o(padL, y(k)), o(W - padR, y(k)), strokeWidth = 1f)
            if (!compact) texto(fmtInt(k), padL - 6f, y(k) + 4f, rotulo, ancora = 1f)
        }
        drawLine(eixo, o(padL, h - padB), o(W - padR, h - padB), strokeWidth = s)
        drawLine(eixo, o(padL, padT), o(padL, h - padB), strokeWidth = s)

        val gh = Param.DUREZA.faixa
        val kh = Param.ALCALINIDADE.faixa
        zona(o(x(gh.okMin), y(kh.okMax)), o(x(gh.okMax), y(kh.okMin)), ChartColors.zone.copy(alpha = 0.08f), ChartColors.zone.copy(alpha = 0.3f), s)
        zona(o(x(gh.idealMin), y(kh.idealMax)), o(x(gh.idealMax), y(kh.idealMin)), ChartColors.zone.copy(alpha = 0.3f), ChartColors.zone, s)

        val f = focus?.let { id -> points.find { it.id == id } }
        val colado = f != null && hypot(x(f.gh) - x(gh.idealMin) - 24f, y(f.kh) - y(kh.idealMax)) < 22f
        if (colado) {
            texto("ideal SCA", x(gh.idealMax) - 4f, y(kh.idealMin) - 4f, ChartColors.zoneText, bold = true, ancora = 1f)
        } else {
            texto("ideal SCA", x(gh.idealMin), y(kh.idealMax) - 5f, ChartColors.zoneText, bold = true)
        }
        texto(if (compact) "GH · dureza" else "GH · dureza, mg/L CaCO₃", W - padR, h - 1f, rotulo, bold = true, ancora = 1f)
        texto("KH · alcalinidade", padL, padT - 9f, rotulo, bold = true)

        if (f != null && route != null) {
            if (route.viaGh != null && route.viaKh != null) {
                drawLine(ChartColors.crema.copy(alpha = 0.35f), o(x(f.gh), y(f.kh)), o(x(route.viaGh), y(route.viaKh)), strokeWidth = s)
                drawCircle(ChartColors.espresso, 5f * s, o(x(route.viaGh), y(route.viaKh)))
                drawCircle(ChartColors.crema.copy(alpha = 0.7f), 5f * s, o(x(route.viaGh), y(route.viaKh)), style = Stroke(1.5f * s))
            }
            val k = t.value
            val ax = x(f.gh + (route.toGh - f.gh) * k)
            val ay = y(f.kh + (route.toKh - f.kh) * k)
            drawLine(ChartColors.crema, o(x(f.gh), y(f.kh)), o(ax, ay), strokeWidth = 2f * s, cap = StrokeCap.Round)
            drawCircle(ChartColors.espresso, 8f * s, o(ax, ay))
            drawCircle(ChartColors.of(route.verdict).copy(alpha = k), 8f * s, o(ax, ay))
            drawCircle(ChartColors.crema, 8f * s, o(ax, ay), style = Stroke(2.5f * s))
        }

        points.forEach { p ->
            val on = p.id == focus
            val alpha = if (focus != null && !on) 0.35f else 1f
            val c = o(x(p.gh), y(p.kh))
            val cor = ChartColors.of(p.verdict)
            if (on) drawCircle(cor.copy(alpha = 0.55f), 13f * s, c, style = Stroke(1.5f * s))
            val r = (if (on) 8f else 6.5f) * s
            drawCircle(cor.copy(alpha = alpha), r, c)
            drawCircle(
                ChartColors.espresso.copy(alpha = alpha), r, c,
                style = Stroke(2f * s, pathEffect = if (fora(p)) PathEffect.dashPathEffect(floatArrayOf(2f * s, 2f * s)) else null),
            )
            if (fora(p) && !compact && route == null) {
                texto("fora da escala", x(p.gh) - 11f, y(p.kh) + 18f, rotulo, ancora = 1f)
            }
        }
    }
}

/** O bloco cor de espresso que carrega o gráfico, com a legenda embaixo. */
@Composable
fun ChartCard(caption: String, modifier: Modifier = Modifier, highlight: String? = null, chart: @Composable () -> Unit) {
    Surface(color = ChartColors.espresso, shape = RoundedCornerShape(28.dp), modifier = modifier.fillMaxWidth()) {
        Column(Modifier.padding(start = 14.dp, end = 14.dp, top = 14.dp, bottom = 18.dp)) {
            chart()
            Spacer(Modifier.height(10.dp))
            Text(
                caption,
                style = MaterialTheme.typography.bodySmall,
                color = ChartColors.onEspresso.copy(alpha = 0.62f),
                modifier = Modifier.padding(horizontal = 4.dp),
            )
            if (highlight != null) {
                Text(
                    highlight,
                    style = MaterialTheme.typography.bodyMediumEmphasized,
                    color = ChartColors.crema,
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                )
            }
        }
    }
}

private fun DrawScope.zona(a: Offset, b: Offset, fill: Color, stroke: Color, s: Float) {
    val r = CornerRadius(4f * s)
    drawRoundRect(fill, a, Size(b.x - a.x, b.y - a.y), r)
    drawRoundRect(stroke, a, Size(b.x - a.x, b.y - a.y), r, style = Stroke(s))
}

private fun fmtInt(v: Double) = v.toInt().toString()

/** Easing usado nas animações de chegada (o mesmo do iPhone). */
@Suppress("unused")
private fun quart(k: Float) = 1 - (1 - k).pow(4)
