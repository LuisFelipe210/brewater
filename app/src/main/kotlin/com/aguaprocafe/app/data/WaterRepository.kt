package com.aguaprocafe.app.data

import com.aguaprocafe.app.model.Field
import com.aguaprocafe.app.model.WaterLabel
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

/** Guarda as águas num JSON simples dentro do armazenamento privado do app. */
class WaterRepository(private val dir: File) {
    private val file = File(dir, "waters.json")
    val photosDir = File(dir, "photos").apply { mkdirs() }

    fun newPhotoFile() = File(photosDir, "${UUID.randomUUID()}.jpg")

    fun load(): List<WaterLabel> {
        if (!file.exists()) return emptyList()
        val arr = runCatching { JSONArray(file.readText()) }.getOrElse { return emptyList() }
        return (0 until arr.length()).mapNotNull { i -> runCatching { fromJson(arr.getJSONObject(i)) }.getOrNull() }
    }

    fun save(list: List<WaterLabel>) {
        val arr = JSONArray()
        list.forEach { arr.put(toJson(it)) }
        val tmp = File(dir, "waters.json.tmp")
        tmp.writeText(arr.toString())
        tmp.renameTo(file)
    }

    private fun toJson(w: WaterLabel) = JSONObject().apply {
        put("id", w.id)
        put("brand", w.brand)
        put("source", w.source)
        put("notes", w.notes)
        put("photo", w.photoPath ?: JSONObject.NULL)
        put("createdAt", w.createdAt)
        put("values", JSONObject().apply { w.values.forEach { (f, v) -> put(f.name, v) } })
    }

    private fun fromJson(o: JSONObject): WaterLabel {
        val vals = o.optJSONObject("values") ?: JSONObject()
        val values = Field.entries.mapNotNull { f ->
            if (vals.has(f.name)) f to vals.getDouble(f.name) else null
        }.toMap()
        return WaterLabel(
            id = o.getString("id"),
            brand = o.optString("brand"),
            source = o.optString("source"),
            notes = o.optString("notes"),
            values = values,
            photoPath = if (o.isNull("photo")) null else o.optString("photo"),
            createdAt = o.optLong("createdAt"),
        )
    }
}
