package com.aguaprocafe.app.ocr

import com.aguaprocafe.app.data.Images
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** OCR no aparelho (ML Kit, modelo embutido): funciona offline e não envia a foto para lugar nenhum. */
object LabelOcr {
    private const val TAMANHO_MAXIMO = 2560

    suspend fun read(photo: File): List<OcrLine> {
        val bitmap = Images.decode(photo, TAMANHO_MAXIMO) ?: error("Não consegui abrir a foto")
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        try {
            val text = recognizer.process(InputImage.fromBitmap(bitmap, 0)).await()
            return text.textBlocks.flatMap { block ->
                block.lines.mapNotNull { line ->
                    val box = line.boundingBox ?: return@mapNotNull null
                    OcrLine(
                        text = line.text,
                        left = box.left,
                        top = box.top,
                        right = box.right,
                        bottom = box.bottom,
                        words = line.elements.mapNotNull { el ->
                            el.boundingBox?.let { OcrWord(el.text, it.left, it.top, it.right, it.bottom) }
                        },
                    )
                }
            }
        } finally {
            recognizer.close()
            bitmap.recycle()
        }
    }

    private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { cont ->
        addOnSuccessListener { cont.resume(it) }
        addOnFailureListener { cont.resumeWithException(it) }
    }
}
