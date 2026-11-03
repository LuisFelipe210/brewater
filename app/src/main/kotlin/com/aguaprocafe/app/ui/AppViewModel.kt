package com.aguaprocafe.app.ui

import android.app.Application
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import com.aguaprocafe.app.data.WaterRepository
import com.aguaprocafe.app.domain.Evaluation
import com.aguaprocafe.app.domain.Evaluator
import com.aguaprocafe.app.domain.WaterProfile
import com.aguaprocafe.app.domain.fmt
import com.aguaprocafe.app.domain.parseNumber
import com.aguaprocafe.app.model.Field
import com.aguaprocafe.app.model.WaterLabel
import com.aguaprocafe.app.ocr.LabelOcr
import com.aguaprocafe.app.ocr.LabelParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.util.UUID

sealed interface Screen {
    data object Home : Screen
    data object Edit : Screen
    data class Result(val id: String) : Screen
}

sealed interface OcrState {
    data object None : OcrState
    data object Running : OcrState
    data class Done(val found: Int) : OcrState
    data class Failed(val message: String) : OcrState
}

/** Formulário em edição. Os valores ficam como texto para não brigar com o que a pessoa digita. */
class Draft(val original: WaterLabel?) {
    var brand by mutableStateOf(original?.brand.orEmpty())
    var source by mutableStateOf(original?.source.orEmpty())
    var notes by mutableStateOf(original?.notes.orEmpty())
    var photoPath by mutableStateOf(original?.photoPath)
    val values = mutableStateMapOf<Field, String>().apply {
        original?.values?.forEach { (f, v) -> put(f, fmt(v, 4)) }
    }
    val fromOcr = mutableStateListOf<Field>()
    var ocr by mutableStateOf<OcrState>(OcrState.None)
    var ocrText by mutableStateOf("")
    var brandError by mutableStateOf(false)

    fun parsedValues(): Map<Field, Double> =
        values.mapNotNull { (f, s) -> parseNumber(s)?.let { f to it } }.toMap()
}

class AppViewModel(app: Application, private val state: SavedStateHandle) : AndroidViewModel(app) {
    private val repo = WaterRepository(app.filesDir)

    var waters by mutableStateOf<List<WaterLabel>>(emptyList())
        private set
    var loaded by mutableStateOf(false)
        private set
    var stack by mutableStateOf<List<Screen>>(listOf(Screen.Home))
        private set
    var draft by mutableStateOf<Draft?>(null)
        private set

    private var ocrJob: Job? = null
    private val saveLock = Mutex()

    val current: Screen get() = stack.last()

    init {
        viewModelScope.launch {
            waters = withContext(Dispatchers.IO) { repo.load() }
            loaded = true
        }
    }

    fun evaluation(w: WaterLabel): Evaluation = Evaluator.evaluate(WaterProfile.from(w.values))

    fun water(id: String) = waters.firstOrNull { it.id == id }

    // --- navegação ---

    private fun push(s: Screen) {
        stack = stack + s
    }

    fun back() {
        if (stack.size <= 1) return
        if (current == Screen.Edit) discardDraft()
        stack = stack.dropLast(1)
    }

    fun open(id: String) = push(Screen.Result(id))

    // --- cadastro ---

    fun startManual() {
        draft = Draft(null)
        push(Screen.Edit)
    }

    fun edit(id: String) {
        draft = Draft(water(id) ?: return)
        push(Screen.Edit)
    }

    /** Arquivo onde a câmera vai gravar. O caminho sobrevive se o Android matar o app durante a foto. */
    fun preparePhotoFile(): File = repo.newPhotoFile().also { state[PENDING] = it.path }

    fun onCameraResult(ok: Boolean) {
        val file = state.get<String>(PENDING)?.let(::File) ?: return
        state.remove<String>(PENDING)
        if (!ok || !file.exists() || file.length() == 0L) {
            file.delete()
            return
        }
        attachPhoto(file)
    }

    fun cancelPendingPhoto() {
        state.remove<String>(PENDING)?.let { File(it).delete() }
    }

    fun onGalleryResult(uri: Uri) {
        viewModelScope.launch {
            val file = repo.newPhotoFile()
            val ok = withContext(Dispatchers.IO) {
                runCatching {
                    getApplication<Application>().contentResolver.openInputStream(uri)!!.use { input ->
                        file.outputStream().use { input.copyTo(it) }
                    }
                }.isSuccess
            }
            if (ok) attachPhoto(file) else file.delete()
        }
    }

    private fun attachPhoto(file: File) {
        val d = draft.takeIf { current == Screen.Edit } ?: Draft(null).also {
            draft = it
            push(Screen.Edit)
        }
        d.photoPath?.takeIf { it != d.original?.photoPath }?.let { File(it).delete() }
        d.photoPath = file.path
        runOcr(d, file)
    }

    private fun runOcr(d: Draft, file: File) {
        ocrJob?.cancel()
        d.ocr = OcrState.Running
        ocrJob = viewModelScope.launch {
            try {
                val lines = withContext(Dispatchers.Default) { LabelOcr.read(file) }
                val parsed = withContext(Dispatchers.Default) { LabelParser.parse(lines) }
                d.ocrText = lines.joinToString("\n") { it.text }
                d.fromOcr.clear()
                // Só preenche o que está vazio: não sobrescreve o que a pessoa já digitou.
                parsed.values.forEach { (f, v) ->
                    if (d.values[f].isNullOrBlank()) {
                        d.values[f] = fmt(v, 4)
                        d.fromOcr += f
                    }
                }
                if (d.source.isBlank()) parsed.source?.let { d.source = it }
                d.ocr = OcrState.Done(parsed.values.size)
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                d.ocr = OcrState.Failed(e.message ?: "Erro ao ler a foto")
            }
        }
    }

    fun removePhoto() {
        val d = draft ?: return
        ocrJob?.cancel()
        d.photoPath?.takeIf { it != d.original?.photoPath }?.let { File(it).delete() }
        d.photoPath = null
        d.ocr = OcrState.None
        d.ocrText = ""
        d.fromOcr.clear()
    }

    fun save() {
        val d = draft ?: return
        if (d.brand.isBlank()) {
            d.brandError = true
            return
        }
        val water = WaterLabel(
            id = d.original?.id ?: UUID.randomUUID().toString(),
            brand = d.brand.trim(),
            source = d.source.trim(),
            notes = d.notes.trim(),
            values = d.parsedValues(),
            photoPath = d.photoPath,
            createdAt = d.original?.createdAt ?: System.currentTimeMillis(),
        )
        // Trocou a foto: a antiga não é mais usada.
        d.original?.photoPath?.takeIf { it != water.photoPath }?.let { File(it).delete() }

        waters = if (d.original == null) waters + water else waters.map { if (it.id == water.id) water else it }
        persist()
        ocrJob?.cancel()
        draft = null
        // Edit → Result (ao editar a partir do resultado, volta para ele)
        val semEdit = stack.dropLast(1)
        stack = if (semEdit.lastOrNull() == Screen.Result(water.id)) semEdit else semEdit + Screen.Result(water.id)
    }

    fun delete(id: String) {
        val w = water(id) ?: return
        w.photoPath?.let { File(it).delete() }
        waters = waters.filter { it.id != id }
        persist()
        stack = stack.filter { it != Screen.Result(id) }.ifEmpty { listOf(Screen.Home) }
    }

    private fun discardDraft() {
        val d = draft ?: return
        ocrJob?.cancel()
        d.photoPath?.takeIf { it != d.original?.photoPath }?.let { File(it).delete() }
        draft = null
    }

    private fun persist() {
        val snapshot = waters
        viewModelScope.launch(Dispatchers.IO) { saveLock.withLock { repo.save(snapshot) } }
    }

    private companion object {
        const val PENDING = "pendingPhoto"
    }
}
