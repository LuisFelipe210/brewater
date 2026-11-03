package com.aguaprocafe.app.update

import android.widget.Toast
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/** Ao abrir o app, avisa se há versão nova no GitHub. */
@Composable
fun UpdateDialog() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var release by remember { mutableStateOf<Release?>(null) }
    var baixando by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { release = Updater.check(context) }

    val r = release ?: return
    AlertDialog(
        onDismissRequest = { if (!baixando) release = null },
        title = { Text("Versão ${r.version} disponível") },
        text = {
            Column(Modifier.heightIn(max = 280.dp).verticalScroll(rememberScrollState())) {
                Text("Você está na ${Updater.installedVersion(context)}. Suas águas continuam salvas.")
                if (r.notes.isNotEmpty()) Text("\n" + r.notes)
            }
        },
        confirmButton = {
            Button(
                enabled = !baixando,
                onClick = {
                    baixando = true
                    scope.launch {
                        runCatching { Updater.install(context, r) }
                            .onSuccess { release = null }
                            .onFailure { Toast.makeText(context, "Não deu para baixar a atualização", Toast.LENGTH_SHORT).show() }
                        baixando = false
                    }
                },
            ) { Text(if (baixando) "Baixando…" else "Atualizar") }
        },
        dismissButton = {
            TextButton(enabled = !baixando, onClick = { release = null }) { Text("Agora não") }
        },
    )
}
