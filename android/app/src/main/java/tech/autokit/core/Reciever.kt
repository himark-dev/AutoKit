package tech.autokit.core

import android.content.Intent
import android.content.Context
import android.content.BroadcastReceiver

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class Receiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        intent.setClass(context, tech.autokit.core.Service::class.java)
        context.startForegroundService(intent)
    }
}

class NotificationService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val extras = sbn.notification.extras
        val broadcastIntent = Intent("tech.autokit.intent.action.NOTIFICATION").apply {
            setPackage(packageName) 
            putExtra("package", sbn.packageName)
            putExtra("title", extras.getString("android.title"))
            putExtra("text", extras.getCharSequence("android.text")?.toString())
            putExtra("id", sbn.id)
        }
        sendBroadcast(broadcastIntent)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {}
}

