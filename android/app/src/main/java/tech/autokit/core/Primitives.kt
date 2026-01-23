package tech.autokit.core

import android.content.Context
import android.content.Intent

import com.beust.klaxon.Parser
import com.beust.klaxon.JsonObject
import com.beust.klaxon.JsonObject as KlaxonFactory

import tech.autokit.core.IPC

typealias JSON = JsonObject
fun JSON(map: Map<String, Any?> = emptyMap()): JSON = KlaxonFactory(map)

class Node(
    val id: String,
    val type: String,
    val pkg: String,
    val config: JSON
) {
    data class Definition (
        val type: String,
        val pkg: String,
        val name: String,
        val icon: String,
        val ports: Int,
        val config: String
    )

    fun execute(ctx: Context, state: JSON): JSON {
        val binder = IPC.bind(ctx, pkg)
        val result = binder?.execute(type, config.toJsonString(), state.toJsonString())
        val parser = Parser.default()
        val json = parser.parse(StringBuilder(result)) as JSON
        return json
    }

    fun trigger(ctx: Context, intent: Intent): JSON? {
        return JSON()
    }
}


class Workflow(val json: JSON) {
    val id: String = json.string("id") ?: ""
    val name: String = json.string("name") ?: ""
    private val triggers = json.obj("triggers") ?: JSON()
    private val nodes = json.obj("nodes") ?: JSON()

    fun find(id: String): JSON? = (triggers[id] ?: nodes[id]) as? JSON

    fun getNextIds(id: String): List<String> {
        val next = find(id)?.get("next")
        return when (next) {
            is List<*> -> next.filterIsInstance<String>()
            is String -> listOf(next)
            else -> emptyList()
        }
    }

    fun bfs(startId: String): Iterable<Node> = Iterable {
        Iterator(startId)
    }

    private inner class Iterator(startId: String) : kotlin.collections.Iterator<Node> {
        private val queue: java.util.Queue<String> = java.util.LinkedList()

        init {
            if (find(startId) != null) {
                queue.add(startId)
            }
        }

        override fun hasNext(): Boolean = queue.isNotEmpty()

        override fun next(): Node {
            val id = queue.poll() ?: throw NoSuchElementException()
            val data = find(id) ?: throw IllegalStateException("Node $id missing")

            getNextIds(id).forEach { next ->
                queue.add(next)
            }

            return Registry.create(id, data.string("type")!!, data.obj("config")!!)
        }
    }

    fun extractSubscriptions(): Map<String, String> {
        val result = mutableMapOf<String, String>()
        triggers.forEach { (id, value) ->
            val triggerData = value as? JsonObject
            val action = triggerData?.obj("config")?.string("action")
            if (action != null) {
                result[action] = id
            }
        }
        return result
    }

    companion object {
        fun fromString(jsonString: String): Workflow {
            val parser = Parser.default()
            val json = parser.parse(StringBuilder(jsonString)) as JSON
            return Workflow(json)
        }
    }
}
