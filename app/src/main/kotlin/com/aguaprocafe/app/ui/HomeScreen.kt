@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package com.aguaprocafe.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FloatingActionButtonMenu
import androidx.compose.material3.FloatingActionButtonMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialShapes
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedListItem
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ToggleFloatingActionButton
import androidx.compose.material3.ToggleFloatingActionButtonDefaults.animateIcon
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.toShape
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aguaprocafe.app.R
import com.aguaprocafe.app.domain.Evaluation
import com.aguaprocafe.app.domain.fmt
import com.aguaprocafe.app.model.WaterLabel

@Composable
fun HomeScreen(
    waters: List<Pair<WaterLabel, Evaluation>>,
    loaded: Boolean,
    onOpen: (String) -> Unit,
    onCamera: () -> Unit,
    onGallery: () -> Unit,
    onManual: () -> Unit,
) {
    var menuAberto by rememberSaveable { mutableStateOf(false) }
    BackHandler(menuAberto) { menuAberto = false }
    val scroll = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    val fundo = LocalSuperficies.current.tela

    Box(Modifier.fillMaxSize()) {
        Scaffold(
            modifier = Modifier.nestedScroll(scroll.nestedScrollConnection),
            containerColor = fundo,
            topBar = {
                LargeFlexibleTopAppBar(
                    title = { Text(stringResource(R.string.app_name)) },
                    subtitle = {
                        Text(
                            when (waters.size) {
                                0 -> "A água certa para o seu café"
                                1 -> "1 água cadastrada"
                                else -> "${waters.size} águas, da melhor para a pior"
                            },
                        )
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = fundo, scrolledContainerColor = fundo),
                    scrollBehavior = scroll,
                )
            },
        ) { pad ->
            when {
                !loaded -> Box(Modifier.fillMaxSize().padding(pad))
                waters.isEmpty() -> EmptyState(Modifier.padding(pad), onCamera, onGallery, onManual)
                else -> LazyColumn(
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = pad.calculateTopPadding() + 8.dp,
                        bottom = pad.calculateBottomPadding() + 120.dp,
                    ),
                ) {
                    item(key = "grafico") {
                        val pontos = waters.mapNotNull { (w, e) ->
                            val gh = e.profile.gh ?: return@mapNotNull null
                            val kh = e.profile.kh ?: return@mapNotNull null
                            ChartPoint(w.id, gh, kh, e.verdict)
                        }
                        ChartCard(
                            caption = "${waters.size} ${if (waters.size == 1) "água" else "águas"} no gráfico da SCA. Toque num ponto para abrir.",
                        ) {
                            WaterChart(pontos, "Gráfico de dureza e alcalinidade com ${pontos.size} águas", onSelect = onOpen)
                        }
                        Spacer(Modifier.height(16.dp))
                    }
                    itemsIndexed(waters, key = { _, it -> it.first.id }) { i, (w, e) ->
                        WaterItem(w, e, i, waters.size) { onOpen(w.id) }
                    }
                }
            }
        }

        // Fundo escurece com o menu aberto, como no Google Drive; toque fora fecha
        val escuro by animateFloatAsState(if (menuAberto) 0.6f else 0f, MaterialTheme.motionScheme.defaultEffectsSpec(), label = "fundo")
        if (escuro > 0f) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.scrim.copy(alpha = escuro))
                    .clickable(remember { MutableInteractionSource() }, indication = null) { menuAberto = false },
            )
        }

        if (waters.isNotEmpty()) {
            FloatingActionButtonMenu(
                expanded = menuAberto,
                modifier = Modifier.align(Alignment.BottomEnd).navigationBarsPadding(),
                button = {
                    ToggleFloatingActionButton(checked = menuAberto, onCheckedChange = { menuAberto = it }) {
                        Icon(
                            if (checkedProgress > 0.5f) Icons.Filled.Close else Icons.Filled.Add,
                            contentDescription = if (menuAberto) "Fechar" else "Nova água",
                            modifier = Modifier.animateIcon({ checkedProgress }),
                        )
                    }
                },
            ) {
                FloatingActionButtonMenuItem(
                    onClick = {
                        menuAberto = false
                        onCamera()
                    },
                    text = { Text("Fotografar rótulo") },
                    icon = { Icon(painterResource(R.drawable.ic_camera), null) },
                )
                FloatingActionButtonMenuItem(
                    onClick = {
                        menuAberto = false
                        onGallery()
                    },
                    text = { Text("Foto da galeria") },
                    icon = { Icon(painterResource(R.drawable.ic_gallery), null) },
                )
                FloatingActionButtonMenuItem(
                    onClick = {
                        menuAberto = false
                        onManual()
                    },
                    text = { Text("Digitar valores") },
                    icon = { Icon(Icons.Filled.Edit, null) },
                )
            }
        }
    }
}

@Composable
private fun WaterItem(w: WaterLabel, e: Evaluation, index: Int, count: Int, onClick: () -> Unit) {
    val color = LocalStatusColors.current.of(e.verdict)
    val p = e.profile
    val resumo = listOfNotNull(
        p.gh?.let { "GH ${fmt(it, 0)}" },
        p.kh?.let { "KH ${fmt(it, 0)}" },
        p.tds?.let { "TDS ${fmt(it, 0)}" },
    ).joinToString(" · ")
    SegmentedListItem(
        onClick = onClick,
        shapes = ListItemDefaults.segmentedShapes(index, count),
        colors = itemColors(),
        modifier = Modifier.padding(top = if (index > 0) ListItemDefaults.SegmentedGap else 0.dp),
        leadingContent = { ScoreBadge(e.score, color) },
        supportingContent = {
            Column {
                Text(e.verdict.title, color = color, style = MaterialTheme.typography.bodyMediumEmphasized)
                if (resumo.isNotEmpty()) Text(resumo)
            }
        },
        trailingContent = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null) },
    ) {
        Text(w.brand, style = MaterialTheme.typography.titleMediumEmphasized, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun EmptyState(modifier: Modifier, onCamera: () -> Unit, onGallery: () -> Unit, onManual: () -> Unit) {
    Column(
        modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier
                .size(140.dp)
                .clip(MaterialShapes.Cookie12Sided.toShape())
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painterResource(R.drawable.ic_drop),
                null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.size(56.dp),
            )
        }
        Spacer(Modifier.height(28.dp))
        Text(
            "Qual água vai no seu café?",
            style = MaterialTheme.typography.headlineMediumEmphasized,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Fotografe a tabela de composição do rótulo ou digite os valores. Comparo com os parâmetros da " +
                "SCA (Specialty Coffee Association) e digo se ela serve para café especial.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(32.dp))
        Button(
            onClick = onCamera,
            shapes = ButtonDefaults.shapes(),
            modifier = Modifier.fillMaxWidth().heightIn(min = ButtonDefaults.MediumContainerHeight),
            contentPadding = ButtonDefaults.MediumContentPadding,
        ) {
            Icon(painterResource(R.drawable.ic_camera), null, Modifier.size(22.dp))
            Spacer(Modifier.width(10.dp))
            Text("Fotografar rótulo", style = MaterialTheme.typography.titleMedium)
        }
        Spacer(Modifier.height(10.dp))
        FilledTonalButton(
            onClick = onGallery,
            shapes = ButtonDefaults.shapes(),
            modifier = Modifier.fillMaxWidth().heightIn(min = ButtonDefaults.MediumContainerHeight),
            contentPadding = ButtonDefaults.MediumContentPadding,
        ) {
            Icon(painterResource(R.drawable.ic_gallery), null, Modifier.size(22.dp))
            Spacer(Modifier.width(10.dp))
            Text("Escolher da galeria", style = MaterialTheme.typography.titleMedium)
        }
        Spacer(Modifier.height(6.dp))
        TextButton(onClick = onManual, shapes = ButtonDefaults.shapes()) { Text("Digitar os valores") }
    }
}
