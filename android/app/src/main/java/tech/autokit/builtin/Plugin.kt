package tech.autokit.builtin

import android.content.Intent
import android.os.IBinder
import android.os.RemoteException

import com.beust.klaxon.Parser

import tech.autokit.core.JSON
import tech.autokit.IPlugin
import tech.autokit.builtin.nodes.*

class Plugin : android.app.Service() {

    private val binder = object : IPlugin.Stub() {
        override fun discover(): Map<*, *> {
            val registry = listOf(
                Log::class.java,
                Manual::class.java,
                Flashlight::class.java,
                Sleep::class.java
            )

            return registry.associate { clazz ->
                val meta = clazz.getAnnotation(Node.Definition::class.java)
                val type = clazz.name
                
                type to tech.autokit.core.Node.Definition(
                    type = type,
                    pkg = "tech.autokit",
                    name = clazz.simpleName,
                    icon = meta?.icon ?: "",
                    ports = meta?.ports ?: 1,
                    config = meta?.config ?: "{}"
                )
            }
        }

        override fun execute(
            type:   String,
            config: String,
            state:  String
        ): String? {
            return try {
                val parser = Parser.default()

                val clazz = Class.forName(type)
                val constructor = clazz.getConstructor(JSON::class.java)

                val configJson = parser.parse(StringBuilder(config)) as JSON
                val node = constructor.newInstance(configJson) as Node


                val stateJson = parser.parse(StringBuilder(state)) as JSON
                val result = node.execute(this@Plugin, stateJson)
                
                result?.toJsonString()
            } catch (e: Exception) {
                android.util.Log.d("AutoKit", "Error: ${e.message}")
                return "ERROR: ${e.message}" // Теперь возвращается String, компилятор доволен
            }
        }

        override fun trigger(
            type:   String,
            config: String,
            intent: Intent
        ): String? {
            android.util.Log.d("AutoKit", "TRIGGER: $intent")
            return null
        }
    }

    override fun onBind(intent: Intent): IBinder = binder
}