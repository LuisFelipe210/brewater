@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package com.aguaprocafe.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedListItem
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aguaprocafe.app.domain.Evaluation
import com.aguaprocafe.app.domain.Verdict
import com.aguaprocafe.app.domain.WaterProfile
import com.aguaprocafe.app.domain.Improvements
import com.aguaprocafe.app.domain.Mistura
import com.aguaprocafe.app.domain.Param
import com.aguaprocafe.app.domain.ParamResult
import com.aguaprocafe.app.domain.TdsSource
import com.aguaprocafe.app.domain.fmt
import com.aguaprocafe.app.model.Field
import com.aguaprocafe.app.model.WaterLabel

@Composable
fun ResultScreen(
    water: WaterLabel,
    eval: Evaluation,
    all: List<WaterLabel>,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onOpen: (String) -> Unit,
) {
    var confirmDelete by remember { mutableStateOf(false) }
    val diluicao = remember(eval) { Improvements.melhorDiluicao(eval.profile) }
    val mistura = remember(eval, all) { Improvements.melhorMistura(water, eval.profile, all) }
    val mineralizar = Improvements.precisaMineralizar(eval.profile)
    val scroll = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    val fundo = LocalSuperficies.current.tela

    Scaffold(
        modifier = Modifier.nestedScroll(scroll.nestedScrollConnection),
        containerColor = fundo,
        topBar = {
            LargeFlexibleTopAppBar(
                title = { Text(water.brand, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                subtitle = if (water.source.isNotBlank()) ({ Text(water.source, maxLines = 1, overflow = TextOverflow.Ellipsis) }) else null,
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Voltar") }
                },
                actions = {
                    IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, "Editar") }
                    IconButton(onClick = { confirmDelete = true }) { Icon(Icons.Filled.Delete, "Excluir") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = fundo, scrolledContainerColor = fundo),
                scrollBehavior = scroll,
            )
        },
    ) { pad ->
        LazyColumn(
            contentPadding = PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = pad.calculateTopPadding() + 8.dp,
                bottom = pad.calculateBottomPadding() + 32.dp,
            ),
        ) {
            item { Hero(eval) }

            val p = eval.profile
            if (p.gh != null && p.kh != null) {
                item {
                    // A melhor correção vira a rota no gráfico, chegando com a cor da nota nova
                    val melhor = listOfNotNull(mistura, diluicao).maxByOrNull { it.nota }
                    val route = remember(melhor, p) {
                        melhor?.let { m ->
                            val outra = m.parceira?.let { WaterProfile.from(it.values) }
                            val r = p.mix(outra, m.fracao)
                            ChartRoute(r.gh!!, r.kh!!, veredito(m.nota), outra?.gh, outra?.kh)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    ChartCard(
                        caption = "GH ${fmt(p.gh, 0)} · KH ${fmt(p.kh, 0)}",
                        highlight = melhor?.let { rotaTexto(it, eval.score ?: it.notaAntes) },
                    ) {
                        WaterChart(
                            listOf(ChartPoint(water.id, p.gh, p.kh, eval.verdict)),
                            "${water.brand} no gráfico: GH ${fmt(p.gh, 0)}, KH ${fmt(p.kh, 0)}",
                            focus = water.id,
                            route = route,
                        )
                    }
                }
            }

            if (eval.results.isNotEmpty()) {
                item { SectionTitle("Parâmetros") }
                itemsIndexed(eval.results, key = { _, it -> it.param.name }) { i, r ->
                    ParamSegment(r, eval, i, eval.results.size)
                }
            }

            val sugestoes = buildList<@Composable (Int, Int) -> Unit> {
                diluicao?.let { m -> add { i, n -> MisturaSegment(m, water.brand, i, n, onOpen) } }
                mistura?.let { m -> add { i, n -> MisturaSegment(m, water.brand, i, n, onOpen) } }
                if (mineralizar && mistura == null) {
                    add { i, n ->
                        Segment(i, n) {
                            Column {
                                Text(
                                    "Falta mineral",
                                    style = MaterialTheme.typography.titleMediumEmphasized,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "Diluir não resolve: ela já é leve demais. Misture com uma água mais mineralizada " +
                                        "(cadastre outras marcas que eu calculo a melhor proporção) ou use concentrados " +
                                        "de minerais para café.",
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                            }
                        }
                    }
                }
            }
            if (sugestoes.isNotEmpty()) {
                item { SectionTitle("Como melhorar") }
                itemsIndexed(sugestoes) { i, s -> s(i, sugestoes.size) }
            }

            if (eval.notes.isNotEmpty()) {
                item { SectionTitle("Observações") }
                itemsIndexed(eval.notes) { i, nota ->
                    SegmentedListItem(
                        shapes = ListItemDefaults.segmentedShapes(i, eval.notes.size),
                        colors = itemColors(),
                        modifier = Modifier.padding(top = if (i > 0) ListItemDefaults.SegmentedGap else 0.dp),
                        leadingContent = { Icon(Icons.Filled.Info, null, tint = MaterialTheme.colorScheme.primary) },
                    ) { Text(nota, style = MaterialTheme.typography.bodyMedium) }
                }
            }

            item { SectionTitle("Dados do rótulo") }
            val linhas = Field.entries.filter { it in water.values }
            val temFoto = water.photoPath != null
            val total = linhas.size + (if (temFoto) 1 else 0) + (if (water.notes.isNotBlank()) 1 else 0)
            if (temFoto) {
                item {
                    Segment(0, total, contentPadding = PaddingValues(8.dp)) {
                        PhotoImage(water.photoPath!!, Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(20.dp)))
                    }
                }
            }
            val desloc = if (temFoto) 1 else 0
            itemsIndexed(linhas) { i, f ->
                SegmentedListItem(
                    shapes = ListItemDefaults.segmentedShapes(i + desloc, total),
                    colors = itemColors(),
                    modifier = Modifier.padding(top = if (i + desloc > 0) ListItemDefaults.SegmentedGap else 0.dp),
                    trailingContent = {
                        Text(
                            fmt(water.values.getValue(f), 3) + if (f.unit.isNotEmpty()) " ${f.unit}" else "",
                            style = MaterialTheme.typography.bodyLarge,
                        )
                    },
                ) { Text(f.label) }
            }
            if (water.notes.isNotBlank()) {
                item {
                    SegmentedListItem(
                        shapes = ListItemDefaults.segmentedShapes(total - 1, total),
                        colors = itemColors(),
                        modifier = Modifier.padding(top = ListItemDefaults.SegmentedGap),
                        overlineContent = { Text("Anotações") },
                    ) { Text(water.notes) }
                }
            }

            item {
                Spacer(Modifier.height(20.dp))
                CriteriosSegment()
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            icon = { Icon(Icons.Filled.Delete, null) },
            title = { Text("Excluir ${water.brand}?", textAlign = TextAlign.Center) },
            text = { Text("Apaga o cadastro e a foto do rótulo.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    onDelete()
                }) { Text("Excluir", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancelar") } },
        )
    }
}

@Composable
private fun Hero(eval: Evaluation) {
    val color = LocalStatusColors.current.of(eval.verdict)
    Surface(
        shape = RoundedCornerShape(32.dp),
        color = LocalSuperficies.current.item,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            Modifier.padding(horizontal = 24.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            ScoreDial(eval.score, color)
            Spacer(Modifier.height(20.dp))
            Text(
                eval.verdict.title,
                style = MaterialTheme.typography.headlineSmallEmphasized,
                color = color,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                eval.verdict.description,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun ParamSegment(r: ParamResult, eval: Evaluation, index: Int, count: Int) {
    val p = eval.profile
    val origem = when (r.param) {
        Param.DUREZA -> p.ghOrigem
        Param.ALCALINIDADE -> p.khOrigem
        Param.TDS -> p.tdsSource?.takeIf { it != TdsSource.MEDIDO }?.description
        else -> null
    }
    Segment(index, count) {
        Column {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(r.param.title, style = MaterialTheme.typography.titleMediumEmphasized, modifier = Modifier.weight(1f))
                Text(
                    fmt(r.value, if (r.param == Param.PH) 2 else 1),
                    style = MaterialTheme.typography.titleLargeEmphasized,
                )
                if (r.param.unit.isNotEmpty()) {
                    Text(
                        " ${r.param.unit}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 3.dp),
                    )
                }
            }
            if (origem != null) {
                Text(origem, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(12.dp))
            RangeBar(r.param, r.value)
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                StatusPill(r.status)
                Spacer(Modifier.weight(1f))
                Text(r.param.faixaTexto, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(10.dp))
            Text(r.message, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun MisturaSegment(m: Mistura, brand: String, index: Int, count: Int, onOpen: (String) -> Unit) {
    val parceira = m.parceira
    val outraNome = parceira?.brand ?: "água destilada ou de osmose"
    val corEsta = MaterialTheme.colorScheme.primary
    val corOutra = MaterialTheme.colorScheme.tertiary
    Segment(index, count) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (parceira == null) "Diluir" else "Misturar com $outraNome",
                    style = MaterialTheme.typography.titleMediumEmphasized,
                    modifier = Modifier.weight(1f),
                )
                if (parceira != null) {
                    IconButton(onClick = { onOpen(parceira.id) }) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "Abrir $outraNome")
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth().height(14.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(Modifier.weight(m.fracao.toFloat()).height(14.dp).clip(RoundedCornerShape(50)).background(corEsta))
                Box(Modifier.weight((1 - m.fracao).toFloat()).height(14.dp).clip(RoundedCornerShape(50)).background(corOutra))
            }
            Spacer(Modifier.height(10.dp))
            Legenda(corEsta, "${m.percentual}% $brand")
            Legenda(corOutra, "${100 - m.percentual}% $outraNome")
            Spacer(Modifier.height(12.dp))
            Text("Nota estimada: ${m.nota} (sozinha: ${m.notaAntes})", style = MaterialTheme.typography.bodyLargeEmphasized)
            Text(
                "Estimativa sem considerar o pH, que muda pouco a nota.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun Legenda(color: Color, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(color))
        Spacer(Modifier.width(8.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun CriteriosSegment() {
    var aberto by remember { mutableStateOf(false) }
    Column {
        SegmentedListItem(
            onClick = { aberto = !aberto },
            shapes = ListItemDefaults.segmentedShapes(0, if (aberto) 2 else 1),
            colors = itemColors(),
            trailingContent = { Icon(if (aberto) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown, null) },
        ) { Text("Como a nota é calculada") }
        if (aberto) {
            Segment(1, 2) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        "Faixas baseadas no padrão de água da SCA (Specialty Coffee Association) e no SCA Water Chart. " +
                            "Cada parâmetro vale 100% dentro do ideal e cai aos poucos até a borda do aceitável. " +
                            "Se a dureza ou a alcalinidade estiverem fora do aceitável, a nota para em “Regular”.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Param.entries.forEach { p ->
                        Text(
                            "${p.title}: ${p.faixaTexto}, ${p.aceitavelTexto} · peso ${p.weight}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        "Dureza (GH) = Ca × 2,497 + Mg × 4,118 · Alcalinidade (KH) = HCO₃⁻ × 0,82 · valores em mg/L como CaCO₃.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

private fun veredito(nota: Int) = when {
    nota >= 85 -> Verdict.EXCELENTE
    nota >= 70 -> Verdict.BOA
    nota >= 50 -> Verdict.REGULAR
    else -> Verdict.RUIM
}

private fun rotaTexto(m: Mistura, antes: Int): String {
    val pct = m.percentual
    return m.parceira?.let { "Misturando $pct% dela com ${100 - pct}% de ${it.brand}, a nota vai de $antes para ${m.nota}" }
        ?: "Com ${100 - pct}% de água destilada, a nota vai de $antes para ${m.nota}"
}
