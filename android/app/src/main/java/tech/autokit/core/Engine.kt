package tech.autokit.core

import android.content.Context

import tech.autokit.core.ID
import tech.autokit.core.Workflow

class Engine(private val ctx: Context) {

    fun run(workflow: Workflow, trigger: ID) {
        val state = JSON()

        for (id in workflow.bfs(trigger)) {
            val nodeJson = workflow[id]!!
            val type = nodeJson.string("type")!!
            val config = nodeJson.obj("config")!!
            // resolve config here
    
            val node = Registry.create(type, config)
            val result = node.execute(ctx)
            
            state[id] = result
        }
    }
}
