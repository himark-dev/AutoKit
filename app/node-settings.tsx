import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

export default function NodeSettingScreen() {
  const router = useRouter();

  const { nodeId, type, config } = useLocalSearchParams<{
    nodeId: string;
    type: string;
    config: string;
  }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
      <View className="flex-1 bg-google-bg px-6">
        <View className="flex-row items-center mb-6 mt-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>

          <Text className="text-white font-google text-xl">
            {type ?? "Node"} settings
          </Text>
        </View>

        <Text className="text-gray-400 font-google text-base">
          nodeId: {nodeId}
        </Text>

        <Text className="text-gray-400 font-google text-base mt-2">
          type: {type}
        </Text>

        <Text className="text-gray-400 font-google text-base mt-2">
          config: {config}
        </Text>
      </View>
    </SafeAreaView>
  );
}
