import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

export default function Settings() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
      <View className="flex-1 bg-google-bg px-6">
        <View className="flex-row items-center mb-6 mt-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white font-google text-xl">Settings</Text>
        </View>
        <Text className="text-gray-400 font-google text-base">
          Settings screen coming soon...
        </Text>
      </View>
    </SafeAreaView>
  );
}
