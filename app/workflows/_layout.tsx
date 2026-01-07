import { Stack } from "expo-router";

export default function RootLayout() {
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
