package tech.autokit.core

import android.content.Context
import android.content.Intent

import com.beust.klaxon.JsonObject
import com.beust.klaxon.Parser

import tech.autokit.core.IPC

typealias JSON = JsonObject
fun JSON(json: String = "{}"): JSON {
    return Parser.default().parse(StringBuilder(json)) as JSON
}

typealias ID = String

class Node(
    val type: String,
    val pkg: String,
    val config: JSON
) {
    data class Definition(
        val type: String,
        val pkg: String,
        val name: String,
        val icon: String,
        val ports: Ports,
        val schema: String
    ) {
        data class Ports(
            val input: Int = 0,
            val special: Int = 0,
            val output: Int = 0
        )
    }

    fun execute(ctx: Context): JSON {
        val plugin = IPC.bind(ctx, pkg)
        val result = plugin?.execute(type, config.toJsonString())
        val json = JSON(result ?: "{}")
        return json
    }
}


class Workflow(val json: JSON) {
    val id: String = json.string("id") ?: ""
    val name: String = json.string("name") ?: ""
    private val triggers = json.obj("triggers") ?: JSON()
    private val nodes = json.obj("nodes") ?: JSON()

    fun find(id: ID): JSON? = (triggers[id] ?: nodes[id]) as? JSON

    operator fun get(id: ID): JSON? = (triggers[id] ?: nodes[id]) as? JSON

    fun getNextIds(id: ID): List<String> {
        val next = find(id)?.get("next")
        return when (next) {
            is List<*> -> next.filterIsInstance<String>()
            is String -> listOf(next)
            else -> emptyList()
        }
    }

    fun bfs(entry: ID): Iterable<ID> = Iterable {
        Iterator(entry)
    }

    private inner class Iterator(entry: ID) : kotlin.collections.Iterator<ID> {
        private val queue: java.util.Queue<ID> = java.util.LinkedList()

        init {
            if (find(entry) != null) {
                queue.add(entry)
            } else {
                android.util.Log.d("AutoKit", "Trigger not found")
            }
        }

        override fun hasNext(): Boolean = queue.isNotEmpty()

        override fun next(): ID {
            val id = queue.poll() ?: throw NoSuchElementException()
            val data = find(id) ?: throw IllegalStateException("Node $id missing")

            getNextIds(id).forEach { next ->
                queue.add(next)
            }

            return id
        }
    }

    fun extractSubscriptions(): Map<String, ID> {
        val result = mutableMapOf<String, ID>()

        triggers.forEach { (key, value) ->
            val trigger = triggers.obj(key)
            val action = trigger?.obj("config")?.string("action")

            if (!action.isNullOrEmpty()) {
                result[action] = key
            }
        }

        return result
    }

    companion object {
        fun fromString(json: String): Workflow {
            return Workflow(JSON(json))
        }
    }
}
