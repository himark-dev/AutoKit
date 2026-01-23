package tech.autokit.core

import android.content.Context
import android.content.Intent
import android.content.ComponentName
import android.content.ServiceConnection
import android.os.IBinder
import android.util.Log

import tech.autokit.IPlugin

object IPC {
    private val connections = mutableMapOf<String, IPlugin>()

    fun bind(ctx: Context, pkg: String): IPlugin? {
        if (connections.containsKey(pkg)) return connections[pkg]

        val intent = Intent("tech.autokit.intent.action.EXTENSION").setPackage(pkg)
        val latch = java.util.concurrent.CountDownLatch(1)
        var service: IPlugin? = null

        val conn = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName, binder: IBinder) {
                service = IPlugin.Stub.asInterface(binder)
                connections[pkg] = service!!
                latch.countDown()
            }
            override fun onServiceDisconnected(name: ComponentName) {
                connections.remove(pkg)
            }
        }

        if (ctx.bindService(intent, conn, Context.BIND_AUTO_CREATE)) {
            latch.await(1, java.util.concurrent.TimeUnit.SECONDS)
        }
        return service
    }

    fun connect(ctx: Context, pkg: String, action: (IBinder) -> Unit) {
        val intent = Intent("tech.autokit.intent.action.EXTENSION").setPackage(pkg)
        
        val connection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName, binder: IBinder) {
                try {
                    action(binder)
                } catch (e: Exception) {
                    Log.e("AutoKit", "Error during temporary connection to $pkg", e)
                } finally {
                    // Критически важно: отключаемся сразу после выполнения действия
                    ctx.unbindService(this)
                }
            }

            override fun onServiceDisconnected(name: ComponentName) {
                // Сервис упал или был убит системой
            }
            
            override fun onNullBinding(name: ComponentName) {
                Log.e("AutoKit", "Service $pkg returned null binder")
                ctx.unbindService(this)
            }
        }

        val success = ctx.bindService(intent, connection, Context.BIND_AUTO_CREATE)
        if (!success) {
            Log.e("AutoKit", "Could not bind to $pkg")
        }
    }

    fun releaseAll(context: Context) {
        // Вызывать, когда WorkflowService завершает работу (onDestroy)
        // Чтобы не текла память и плагины могли уснуть
    }
}