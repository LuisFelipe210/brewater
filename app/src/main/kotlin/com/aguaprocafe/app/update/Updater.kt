package com.aguaprocafe.app.update

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

data class Release(val version: String, val notes: String, val apkUrl: String)

/** Atualização pelas releases do GitHub: a tag é "v" + versionName e o APK vai como anexo. */
object Updater {
    private const val LATEST = "https://api.github.com/repos/LuisFelipe210/brewater/releases/latest"

    /** A release mais nova, se for mais nova que a instalada. Sem internet devolve null. */
    suspend fun check(context: Context): Release? = withContext(Dispatchers.IO) {
        runCatching {
            val json = JSONObject(open(LATEST).inputStream.bufferedReader().use { it.readText() })
            val version = json.getString("tag_name").removePrefix("v")
            val assets = json.getJSONArray("assets")
            val apk = (0 until assets.length()).map { assets.getJSONObject(it) }
                .firstOrNull { it.getString("name").endsWith(".apk") } ?: return@runCatching null
            if (!isNewer(version, installedVersion(context))) return@runCatching null
            Release(version, json.optString("body").trim(), apk.getString("browser_download_url"))
        }.getOrNull()
    }

    /** Baixa o APK para o cache e abre o instalador do Android. */
    suspend fun install(context: Context, release: Release) {
        val file = withContext(Dispatchers.IO) {
            val dir = File(context.cacheDir, "updates").apply { mkdirs() }
            val file = File(dir, "brewater.apk")
            open(release.apkUrl).inputStream.use { input -> file.outputStream().use { input.copyTo(it) } }
            file
        }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
        context.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    fun installedVersion(context: Context): String =
        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "0"

    /** Compara "1.10" com "1.9" número a número. */
    fun isNewer(candidate: String, current: String): Boolean {
        val a = candidate.split('.').map { it.toIntOrNull() ?: 0 }
        val b = current.split('.').map { it.toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(a.size, b.size)) {
            val d = a.getOrElse(i) { 0 } - b.getOrElse(i) { 0 }
            if (d != 0) return d > 0
        }
        return false
    }

    private fun open(url: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 10_000
            readTimeout = 30_000
            setRequestProperty("Accept", "application/vnd.github+json")
            if (responseCode !in 200..299) error("HTTP $responseCode em $url")
        }
}
