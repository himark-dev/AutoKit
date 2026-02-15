package tech.autokit.builtin.nodes

import android.content.Context

import tech.autokit.builtin.Node
import tech.autokit.core.JSON

@Node.Definition(icon = "list-box-outline")
class Log(
    val message: String
): Node {
    override fun execute(ctx: Context): JSON? {
        android.util.Log.d("AutoKit", "${message}")
        return JSON()
    }
}
