package tech.autokit.core

import android.app.*
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.util.Log

import androidx.core.content.ContextCompat

import kotlinx.coroutines.*

import tech.autokit.database.Storage
import tech.autokit.core.Engine

class Service : android.app.Service() {
    private val database by lazy { Storage.getDatabase(this) }
    private val receiver = Receiver()
    
    private var scope = CoroutineScope(Dispatchers.Main + Job())
    private val engine = Engine(this)

    data class Subscription(val workflow: String, val trigger: String)
    private var subscriptions = mutableMapOf<String, Subscription>()

    override fun onCreate() {
        super.onCreate()
        setupForeground()

        Registry.scan(this)
        updateSubscriptions()
    }

    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        val action = intent.action ?: return START_STICKY
        val sub = subscriptions[action] ?: return START_STICKY
        
        scope.launch {
            withContext(Dispatchers.IO) {
                val entity = database.workflowDao().getById(sub.workflow) ?: return@withContext
                val workflow = Workflow.fromString(entity.json)

                engine.run(workflow, sub.trigger)
            }
        }

        return START_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        try {
            unregisterReceiver(receiver)
        } catch (e: Exception) { }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // 

    private fun setupForeground() {
        val channelId = "engine_service"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Engine Service", NotificationManager.IMPORTANCE_LOW)
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, channelId).setContentTitle("AutoKit Running").build()
        } else {
            Notification.Builder(this).setContentTitle("AutoKit Running").build()
        }
        startForeground(1, notification)
    }

    private fun updateSubscriptions() {
        scope.launch {
            // 1. Fetch active workflows
            val activeWorkflows = withContext(Dispatchers.IO) {
                database.workflowDao().getActive()
            }

            subscriptions.clear()
            activeWorkflows.forEach { entity ->
                val workflow = Workflow.fromString(entity.json)
                val subs = workflow.extractSubscriptions()
                
                subs.forEach { (action, trigger) ->
                    subscriptions[action] = Subscription(entity.id, trigger)
                }
            }

            // 2. Update receiver
            val filter = IntentFilter().apply {
                subscriptions.keys.forEach { addAction(it) }
            }
            try { unregisterReceiver(receiver) } catch (e: Exception) {}
            registerReceiver(receiver, filter, ContextCompat.RECEIVER_EXPORTED)
        }
    }
}
