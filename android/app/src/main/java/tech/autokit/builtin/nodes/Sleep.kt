package tech.autokit.builtin.nodes

import android.content.Context
import tech.autokit.builtin.Node
import tech.autokit.core.JSON

@Node.Definition(icon = "timer", ports = 1)
class Sleep(config: JSON) : Node(config) {

    override fun execute(ctx: Context, state: JSON): JSON {
        // Klaxon может вернуть Number, который нужно привести к Double
        val durationInSeconds = when (val d = config["duration"]) {
            is Number -> d.toDouble()
            else -> 0.0
        }

        if (durationInSeconds > 0) {
            val millis = (durationInSeconds * 1000).toLong()
            try {
                Thread.sleep(millis)
            } catch (e: InterruptedException) {
                android.util.Log.e("AutoKit", "Sleep interrupted")
            }
        }

        return JSON()
    }
}