package com.aguaprocafe.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.aguaprocafe.app.ocr.LabelOcr
import com.aguaprocafe.app.ocr.LabelParser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * adb shell am broadcast -n com.aguaprocafe.app/.OcrDebugReceiver --es path debug/foto.jpg
 *
 * Grava as linhas reconhecidas (com caixas) em files/<foto>.ocr.json para virar teste unitário.
 */
class OcrDebugReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val file = File(context.filesDir, intent.getStringExtra("path") ?: return)
        val pending = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                val lines = LabelOcr.read(file)
                val json = JSONArray()
                lines.forEach { l ->
                    json.put(
                        JSONObject()
                            .put("text", l.text)
                            .put("box", JSONArray(listOf(l.left, l.top, l.right, l.bottom)))
                            .put(
                                "words",
                                JSONArray(l.words.map { w ->
                                    JSONObject().put("text", w.text).put("box", JSONArray(listOf(w.left, w.top, w.right, w.bottom)))
                                }),
                            ),
                    )
                }
                File(file.parentFile, file.name + ".ocr.json").writeText(json.toString(1))
                Log.i(TAG, "linhas=${lines.size} resultado=${LabelParser.parse(lines)}")
            } catch (e: Exception) {
                Log.e(TAG, "falhou", e)
            } finally {
                pending.finish()
            }
        }
    }

    private companion object {
        const val TAG = "OcrDebug"
    }
}
