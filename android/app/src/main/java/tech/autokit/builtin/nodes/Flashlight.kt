package tech.autokit.builtin.nodes

import android.content.Context
import android.hardware.camera2.CameraManager
import android.os.Build
import tech.autokit.builtin.Node
import tech.autokit.core.JSON

@Node.Definition(icon = "flashlight", ports = 1)
class Flashlight(config: JSON) : Node(config) {

    override fun execute(ctx: Context, state: JSON): JSON {
        // Извлекаем значение из конфига (по умолчанию false, если ключа нет)
        val shouldEnable = config.boolean("enable") ?: false

        try {
            val cameraManager = ctx.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            
            // Обычно ID основной камеры с фонариком — "0"
            // В сложных случаях можно пройтись циклом по cameraManager.cameraIdList
            val cameraId = cameraManager.cameraIdList.getOrNull(0)

            if (cameraId != null) {
                cameraManager.setTorchMode(cameraId, shouldEnable)
            } else {
                android.util.Log.e("AutoKit", "No camera with flashlight found")
            }
        } catch (e: Exception) {
            android.util.Log.e("AutoKit", "Flashlight error: ${e.message}")
            // Возвращаем объект с ошибкой, чтобы workflow мог это обработать
            return JSON(mapOf("error" to (e.message ?: "Unknown error")))
        }

        // Возвращаем пустой объект или текущее состояние
        return JSON()
    }
}