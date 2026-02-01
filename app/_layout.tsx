import "@/global.css";

import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";

// Игнорируем предупреждения о keep-awake
LogBox.ignoreLogs(['Unable to activate keep awake']);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "GoogleSans-Regular": require("@/assets/fonts/GoogleSans-Regular.ttf"),
    "GoogleSans-Bold": require("@/assets/fonts/GoogleSans-Bold.ttf"),
  });

  useEffect(() => {
    // Обработчик необработанных promise ошибок
    const handleUnhandledRejection = (event: any) => {
      if (event.reason?.message?.includes('keep awake')) {
        console.warn('Keep awake error ignored:', event.reason.message);
        event.preventDefault();
      }
    };

    // @ts-ignore
    global.addEventListener?.('unhandledrejection', handleUnhandledRejection);

    if (loaded || error) {
      SplashScreen.hideAsync();
    }

    return () => {
      // @ts-ignore
      global.removeEventListener?.('unhandledrejection', handleUnhandledRejection);
    };
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#131314" },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
