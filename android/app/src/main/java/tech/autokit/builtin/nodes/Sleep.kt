package tech.autokit.builtin.nodes

import android.content.Context
import tech.autokit.builtin.Node
import tech.autokit.core.JSON

@Node.Definition(icon = "sleep")
class Sleep(val duration: Double) : Node {
    override fun execute(ctx: Context): JSON? {
        if (duration > 0) {
            val millis = (duration * 1000).toLong()
            try {
                Thread.sleep(millis)
            } catch (e: InterruptedException) {
                android.util.Log.e("AutoKit", "Sleep interrupted")
                Thread.currentThread().interrupt() // Хорошая практика
            }
        }

        return JSON()
    }
}