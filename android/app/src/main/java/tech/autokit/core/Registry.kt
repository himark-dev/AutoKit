package tech.autokit.core

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager;
import android.util.Log

import com.facebook.react.bridge.*;

import tech.autokit.core.JSON
import tech.autokit.core.IPC
import tech.autokit.IPlugin

object Registry {
    
    private val storage = mutableMapOf<String, Node.Definition>()

    fun scan(ctx: Context) {
        val pm = ctx.packageManager
        val intent = Intent("tech.autokit.intent.action.EXTENSION")
        val services = pm.queryIntentServices(intent, 0)

        for (info in services) {
            val pkg = info.serviceInfo.packageName
            IPC.connect(ctx, pkg) { plugin ->
                try {
                    val library = plugin.discover()

                    if (library != null && library is Map<*, *>) {
                        synchronized(storage) {
                            for ((key, value) in library) {
                                if (key is String && value is Node.Definition) {
                                    storage[key] = value
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.d("AutoKit", "Failed to scan $pkg", e)
                }
            }
        }
    }

    fun create(type: String, config: JSON): Node {
        val def = storage[type] ?: throw IllegalArgumentException("Unknown type: $type")
        return Node(def.type, def.pkg, config)
    }

    fun getDefinitions(): List<Node.Definition> = synchronized(storage) {
        storage.values.toList()
    }

    class Module(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
        override fun getName(): String = "Registry"

        @ReactMethod
        fun fetch(promise: Promise) {
            try {
                val array = Arguments.createArray()
                val definitions = Registry.getDefinitions()

                for (def in definitions) {
                    val map = Arguments.createMap().apply {
                        putString("type", def.type)
                        putString("pkg", def.pkg)
                        putString("name", def.name)
                        putString("icon", def.icon)
                        putMap("schema", toWritableMap(JSON(def.schema)))
                    }
                    array.pushMap(map)
                }

                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("FETCH_ERROR", "Could not fetch node library", e)
            }
        }

        private fun toWritableMap(map: Map<String, Any?>): WritableMap {
            val writableMap = Arguments.createMap()
            for ((key, value) in map) {
                when (value) {
                    null -> writableMap.putNull(key)
                    is Boolean -> writableMap.putBoolean(key, value)
                    is Int -> writableMap.putInt(key, value)
                    is Double -> writableMap.putDouble(key, value)
                    is String -> writableMap.putString(key, value)
                    is Map<*, *> -> writableMap.putMap(key, toWritableMap(value as Map<String, Any?>))
                    is List<*> -> writableMap.putArray(key, toWritableArray(value))
                    else -> writableMap.putString(key, value.toString())
                }
            }
            return writableMap
        }

        private fun toWritableArray(list: List<Any?>): WritableArray {
            val writableArray = Arguments.createArray()
            for (value in list) {
                when (value) {
                    null -> writableArray.pushNull()
                    is Boolean -> writableArray.pushBoolean(value)
                    is Int -> writableArray.pushInt(value)
                    is Double -> writableArray.pushDouble(value)
                    is String -> writableArray.pushString(value)
                    is Map<*, *> -> writableArray.pushMap(toWritableMap(value as Map<String, Any?>))
                    is List<*> -> writableArray.pushArray(toWritableArray(value))
                    else -> writableArray.pushString(value.toString())
                }
            }
            return writableArray
        }
    }
}
