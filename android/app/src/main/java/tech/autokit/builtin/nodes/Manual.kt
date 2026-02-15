package tech.autokit.builtin.nodes

import android.content.Context

import tech.autokit.builtin.Node
import tech.autokit.core.JSON

@Node.Definition(icon = "play", ports = Node.Ports(input = 0, output = 1))
class Manual(val action: String): Node {
    override fun execute(ctx: Context): JSON? {
        return JSON()
    }
}
