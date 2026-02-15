package tech.autokit

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class Package : ReactPackage {
    // Регистрация нативных модулей (логика)
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            tech.autokit.database.Module(reactContext),
            tech.autokit.core.Registry.Module(reactContext),
            tech.autokit.core.Workflow.Module(reactContext),
        )
    }

    // Регистрация нативных View (если бы мы создавали свои кнопки/графики)
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
