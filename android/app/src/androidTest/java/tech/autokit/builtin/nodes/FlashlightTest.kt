package tech.autokit.builtin.nodes

import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*
import tech.autokit.core.JSON

@RunWith(AndroidJUnit4::class)
class FlashlightTest {
    
    private val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
    
    @Test
    fun testFlashlightEnableDisable() {
        // Проверяем что код выполняется без исключений
        val enableConfig = JSON(mapOf("enable" to true))
        val flashlight = Flashlight(enableConfig)
        flashlight.execute(context, JSON())
        
        val disableConfig = JSON(mapOf("enable" to false))
        Flashlight(disableConfig).execute(context, JSON())
        
        // Если дошли сюда - тест прошел
        assertTrue(true)
    }
}
