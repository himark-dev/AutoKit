package tech.autokit.builtin.nodes

import android.content.Context

import tech.autokit.builtin.Node
import tech.autokit.core.JSON

@Node.Definition(icon = "terminal", ports = 1337)
class Manual(config: JSON): Node(config) {
    override fun execute(ctx: Context, state: JSON): JSON {
        return JSON()
    }
}
