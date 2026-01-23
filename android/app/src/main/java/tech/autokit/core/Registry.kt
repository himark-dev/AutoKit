package tech.autokit.core

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager;
import android.util.Log

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
            IPC.connect(ctx, pkg) { binder ->
                try {
                    val plugin = IPlugin.Stub.asInterface(binder)
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

    fun create(id: String, type: String, config: JSON): Node {
        val def = storage[type] ?: throw IllegalArgumentException("Unknown type: $type")
        return Node(id, def.type, def.pkg, config)
    }
}
