package tech.autokit.builtin

import android.content.Context

import tech.autokit.core.JSON

abstract class Node(val config: JSON) {
    abstract fun execute(ctx: Context, state: JSON): JSON

    @Target(AnnotationTarget.CLASS)
    @Retention(AnnotationRetention.RUNTIME)
    annotation class Definition(
        val icon: String = "",
        val ports: Int = 1,
        val config: String = "{}"
    )
}
