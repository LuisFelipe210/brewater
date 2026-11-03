@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package com.aguaprocafe.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.aguaprocafe.app.R
import com.aguaprocafe.app.domain.Evaluator
import com.aguaprocafe.app.domain.WaterProfile
import com.aguaprocafe.app.domain.parseNumber
import com.aguaprocafe.app.model.Field

@Composable
fun EditScreen(
    draft: Draft,
    onBack: () -> Unit,
    onSave: () -> Unit,
    onCamera: () -> Unit,
    onGallery: () -> Unit,
    onRemovePhoto: () -> Unit,
) {
    // Recalcula a cada tecla: a prévia da nota acompanha o preenchimento.
    val preview = Evaluator.evaluate(WaterProfile.from(draft.parsedValues()))
    val scroll = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    val fundo = LocalSuperficies.current.tela

    Scaffold(
        modifier = Modifier.nestedScroll(scroll.nestedScrollConnection),
        containerColor = fundo,
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text(if (draft.original == null) "Nova água" else "Editar água") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Voltar") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = fundo, scrolledContainerColor = fundo),
                scrollBehavior = scroll,
            )
        },
        bottomBar = {
            Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh) {
                Row(
                    Modifier.navigationBarsPadding().padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    ScoreBadge(preview.score, LocalStatusColors.current.of(preview.verdict), size = 48.dp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(preview.verdict.title, style = MaterialTheme.typography.titleSmallEmphasized, maxLines = 1)
                        Text(
                            "Prévia da nota",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Button(
                        onClick = onSave,
                        shapes = ButtonDefaults.shapes(),
                        modifier = Modifier.heightIn(min = ButtonDefaults.MediumContainerHeight),
                        contentPadding = ButtonDefaults.MediumContentPadding,
                    ) { Text("Salvar", style = MaterialTheme.typography.titleMedium) }
                }
            }
        },
    ) { pad ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(pad)
                .consumeWindowInsets(pad)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            PhotoSection(draft, onCamera, onGallery, onRemovePhoto)

            SectionTitle("Identificação")
            Segment(0, 1, contentPadding = PaddingValues(16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = draft.brand,
                        onValueChange = {
                            draft.brand = it
                            draft.brandError = false
                        },
                        label = { Text("Marca") },
                        isError = draft.brandError,
                        supportingText = if (draft.brandError) ({ Text("Dê um nome para salvar") }) else null,
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = draft.source,
                        onValueChange = { draft.source = it },
                        label = { Text("Fonte / origem (opcional)") },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            Field.Group.entries.forEach { group ->
                SectionTitle(group.title, hint = group.hint)
                Segment(0, 1, contentPadding = PaddingValues(16.dp)) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Field.entries.filter { it.group == group }.chunked(2).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                row.forEach { f -> NumberField(draft, f, Modifier.weight(1f)) }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }

            SectionTitle("Anotações")
            Segment(0, 1, contentPadding = PaddingValues(16.dp)) {
                OutlinedTextField(
                    value = draft.notes,
                    onValueChange = { draft.notes = it },
                    placeholder = { Text("Ex.: ficou ótima no V60 com café lavado") },
                    minLines = 2,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun NumberField(draft: Draft, f: Field, modifier: Modifier) {
    val text = draft.values[f].orEmpty()
    val lido = f in draft.fromOcr
    val tint = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f)
    OutlinedTextField(
        value = text,
        onValueChange = { s ->
            draft.values[f] = s.filter { it.isDigit() || it == ',' || it == '.' }
            draft.fromOcr.remove(f)
        },
        label = { Text(f.label, maxLines = 1) },
        suffix = if (f.group != Field.Group.IONS && f.unit.isNotEmpty()) ({ Text(f.unit.substringBefore(' ')) }) else null,
        isError = text.isNotBlank() && parseNumber(text) == null,
        singleLine = true,
        shape = RoundedCornerShape(16.dp),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Next),
        colors = if (lido) {
            OutlinedTextFieldDefaults.colors(unfocusedContainerColor = tint, focusedContainerColor = tint)
        } else {
            OutlinedTextFieldDefaults.colors()
        },
        modifier = modifier,
    )
}

@Composable
private fun PhotoSection(draft: Draft, onCamera: () -> Unit, onGallery: () -> Unit, onRemovePhoto: () -> Unit) {
    val path = draft.photoPath
    if (path == null) {
        Segment(0, 1) {
            Column {
                Text("Preencher a partir de uma foto", style = MaterialTheme.typography.titleMediumEmphasized)
                Spacer(Modifier.height(4.dp))
                Text(
                    "Enquadre só a tabela de composição, reta e bem iluminada.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilledTonalButton(onClick = onCamera, shapes = ButtonDefaults.shapes()) {
                        Icon(painterResource(R.drawable.ic_camera), null, Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Câmera")
                    }
                    OutlinedButton(onClick = onGallery, shapes = ButtonDefaults.shapes()) {
                        Icon(painterResource(R.drawable.ic_gallery), null, Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Galeria")
                    }
                }
            }
        }
        return
    }

    Box {
        PhotoImage(path, Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(28.dp)))
        FilledIconButton(
            onClick = onRemovePhoto,
            colors = IconButtonDefaults.filledIconButtonColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                contentColor = MaterialTheme.colorScheme.onSurface,
            ),
            modifier = Modifier.align(Alignment.TopEnd).padding(12.dp),
        ) {
            Icon(Icons.Filled.Close, "Remover foto")
        }
    }
    Spacer(Modifier.height(12.dp))
    Segment(0, 1, contentPadding = PaddingValues(horizontal = 20.dp, vertical = 14.dp)) {
        Column {
            when (val s = draft.ocr) {
                OcrState.Running -> Row(verticalAlignment = Alignment.CenterVertically) {
                    LoadingIndicator(Modifier.size(40.dp))
                    Spacer(Modifier.width(12.dp))
                    Text("Lendo o rótulo…", style = MaterialTheme.typography.bodyLarge)
                }
                is OcrState.Done -> Text(
                    if (s.found > 0) {
                        "Encontrei ${s.found} ${if (s.found == 1) "valor" else "valores"}. Os campos destacados vieram da foto: confira com o rótulo."
                    } else {
                        "Não achei valores na foto. Tente outra mais próxima e reta da tabela, ou digite abaixo."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (s.found > 0) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.error,
                )
                is OcrState.Failed -> Text(
                    "Não consegui ler a foto: ${s.message}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                )
                OcrState.None -> {}
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onCamera, shapes = ButtonDefaults.shapes()) { Text("Nova foto") }
                TextButton(onClick = onGallery, shapes = ButtonDefaults.shapes()) { Text("Galeria") }
                if (draft.ocrText.isNotBlank()) {
                    var aberto by remember { mutableStateOf(false) }
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = { aberto = true }, shapes = ButtonDefaults.shapes()) { Text("Texto lido") }
                    if (aberto) OcrTextDialog(draft.ocrText) { aberto = false }
                }
            }
        }
    }
}

@Composable
private fun OcrTextDialog(text: String, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Fechar") } },
        title = { Text("Texto reconhecido") },
        text = {
            Text(
                text,
                style = MaterialTheme.typography.bodySmall,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.verticalScroll(rememberScrollState()),
            )
        },
    )
}
