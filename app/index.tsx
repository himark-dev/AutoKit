import "@/global.css";

import { ElementType } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import {
  Settings,
  Workflow,
  KeyRound,
  LayoutGrid,
  History,
} from "lucide-react-native";

interface MenuCardProps {
  title: string;
  count: number;
  icon: ElementType;
  iconBg: string;
  href: string;
}

const MenuCard = ({
  title,
  count,
  icon: Icon,
  iconBg,
  href,
}: MenuCardProps) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => href && router.push(href)}
      className="bg-google-card mb-3 p-6 rounded-[28px] flex-row justify-between items-center"
    >
      <View>
        <Text className="text-white font-google text-[22px] mb-1 leading-6">
          {title}
        </Text>
        <Text className="text-gray-400 font-google text-sm">{count} Items</Text>
      </View>
      <View
        className={`w-12 h-12 rounded-2xl items-center justify-center ${iconBg}`}
      >
        <Icon color="white" size={24} />
      </View>
    </TouchableOpacity>
  );
};

export default function App() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
      <View className="flex-1 bg-google-bg px-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-10">
          <View className="flex-row items-center gap-2">
            <LayoutGrid color="#8ab4f8" size={28} />
            <Text className="text-white font-google text-xl">AutoKit</Text>
          </View>
          <TouchableOpacity
            className="p-2"
            onPress={() => router.push("/settings")}
          >
            <Settings color="white" size={24} />
          </TouchableOpacity>
        </View>

        {/* Hero Title */}
        <View className="mb-10">
          <Text className="text-white font-google-bold text-[56px] leading-6">
            Auto
            <Text className="text-google-blue">Kit</Text>
          </Text>
          <Text className="text-gray-400 font-google text-lg mt-4 leading-6">
            Automate your development processes with powerful on-device tools.
          </Text>
        </View>

        {/* Cards List */}
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <MenuCard
            title="Workflows"
            count={12}
            icon={Workflow}
            iconBg="bg-red-400/80"
            href="/workflows"
          />
          <MenuCard
            title="Credentials"
            count={5}
            icon={KeyRound}
            iconBg="bg-green-500/80"
            href="/credentials"
          />
          <MenuCard
            title="History"
            count={48}
            icon={History}
            iconBg="bg-blue-500/80"
            href="/history"
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
