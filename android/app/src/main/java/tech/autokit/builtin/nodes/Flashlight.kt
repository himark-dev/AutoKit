package tech.autokit.builtin.nodes

import android.content.Context
import android.hardware.camera2.CameraManager
import tech.autokit.builtin.Node
import tech.autokit.core.JSON

@Node.Definition(icon = "flashlight")
class Flashlight(val enable: Boolean) : Node {
    override fun execute(ctx: Context): JSON {
        try {
            val cameraManager = ctx.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            
            val cameraId = cameraManager.cameraIdList.getOrNull(0)

            if (cameraId != null) {
                cameraManager.setTorchMode(cameraId, enable)
            } else {
                android.util.Log.e("AutoKit", "No camera with flashlight found")
            }
        } catch (e: Exception) {
            android.util.Log.e("AutoKit", "Flashlight error: ${e.message}")
        }

        return JSON()
    }
}