package tech.autokit.builtin

import android.content.Intent
import android.os.IBinder
import android.os.RemoteException

import kotlin.reflect.KClass

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
                val meta = clazz.getAnnotation(Node.Definition::class.java)!!
                val type = clazz.name
                
                type to tech.autokit.core.Node.Definition(
                    type = type,
                    pkg = "tech.autokit",
                    name = clazz.simpleName,
                    icon = meta.icon,
                    ports = tech.autokit.core.Node.Definition.Ports(meta.ports.input, meta.ports.special, meta.ports.output),
                    schema = generateSchema(clazz)
                )
            }
        }

        override fun execute(
            type:   String,
            config: String
        ): String? {
            return try {
                val configJson = JSON(config) 

                val clazz = Class.forName(type).kotlin
                val constructor = clazz.constructors.first()  

                val args = constructor.parameters.map { param ->
                    val value = configJson[param.name]
                    coerceType(value, param.type.classifier as? KClass<*>)
                }.toTypedArray()

                val node = constructor.call(*args) as Node
                val result = node.execute(this@Plugin)

                result?.toJsonString()
            } catch (e: Exception) {
                android.util.Log.d("AutoKit", "Error: ${e.message}")
                return "ERROR: ${e.message}"
            }
        }

        private fun coerceType(value: Any?, targetClass: KClass<*>?): Any? {
            if (value == null) return null
            
            return when (targetClass) {
                String::class -> value.toString()
                Double::class -> (value as? Number)?.toDouble() ?: 0.0
                Int::class -> (value as? Number)?.toInt() ?: 0
                Boolean::class -> value as? Boolean ?: false
                Long::class -> (value as? Number)?.toLong() ?: 0L
                else -> value
            }
        }

        private fun generateSchema(clazz: Class<*>): String {
            val schema = JSON()
            val constructor = clazz.kotlin.constructors.first()

            constructor?.parameters?.forEach { param ->
                val name = param.name ?: return@forEach
                val fieldProps = JSON()
                
                val type = when (param.type.classifier) {
                    String::class -> "string"
                    Int::class -> "integer"
                    Long::class -> "integer"
                    Float::class, Double::class -> "number"
                    Boolean::class -> "boolean"
                    List::class -> "array"
                    else -> "object"
                }
                
                fieldProps.put("type", type)
                schema.put(name, fieldProps)
            }
            
            return schema.toJsonString()
        }
    }

    override fun onBind(intent: Intent): IBinder = binder
}