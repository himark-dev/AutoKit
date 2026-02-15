package tech.autokit.builtin

import android.content.Context

import tech.autokit.core.JSON

interface Node {

    fun execute(ctx: Context): JSON?

    annotation class Ports(val input: Int = 1, val special: Int = 0, val output: Int = 1)

    @Target(AnnotationTarget.CLASS)
    @Retention(AnnotationRetention.RUNTIME)
    annotation class Definition(
        val icon: String = "\udb80\uded6",
        val ports: Ports = Ports(),
        val config: String = "{}"
    )
}
