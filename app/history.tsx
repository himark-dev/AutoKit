import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText } from "lucide-react-native";
import { useState, useEffect } from "react";
import { HistoryDB, WorkflowRun } from "@/lib/database";

interface HistoryCardProps {
  run: WorkflowRun;
}

const HistoryCard = ({ run }: HistoryCardProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Succeeded': return '#22c55e';
      case 'Error': return '#ef4444';
      case 'Running': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Succeeded': return <CheckCircle color="#22c55e" size={16} />;
      case 'Error': return <XCircle color="#ef4444" size={16} />;
      case 'Running': return <Clock color="#3b82f6" size={16} />;
      default: return <Clock color="#6b7280" size={16} />;
    }
  };

  const showLog = () => {
    Alert.alert(
      `Log - ${run.workflowName}`,
      run.log.join('\n'),
      [{ text: "Close" }],
      { userInterfaceStyle: 'dark' }
    );
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      className="bg-google-card mb-4 p-4 rounded-2xl"
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-white font-google text-lg mb-1">{run.workflowName}</Text>
          <Text className="text-gray-400 font-google text-sm">Run ID: {run.id}</Text>
        </View>
        
        <View className="flex-row items-center">
          {getStatusIcon(run.status)}
          <Text 
            className="font-google text-sm ml-2"
            style={{ color: getStatusColor(run.status) }}
          >
            {run.status}
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Clock color="#6b7280" size={14} />
          <Text className="text-gray-500 font-google text-xs ml-1">
            {formatDate(run.startTime)}
          </Text>
        </View>
        
        <Text className="text-gray-500 font-google text-xs">
          Duration: {formatDuration(run.duration)}
        </Text>
      </View>
      
      <View className="flex-row justify-end">
        <TouchableOpacity 
          className="flex-row items-center bg-blue-500/20 px-3 py-2 rounded-xl"
          onPress={showLog}
        >
          <FileText color="#8ab4f8" size={14} />
          <Text className="text-blue-400 font-google text-xs ml-1">View Log</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function History() {
  const router = useRouter();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      await HistoryDB.initWithSampleData();
      const data = await HistoryDB.getAll();
      setRuns(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

export default function History() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
      <View className="flex-1 bg-google-bg px-6">
        <View className="flex-row items-center mb-6 mt-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white font-google text-xl">History</Text>
        </View>
        
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-400 font-google text-base">Loading history...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {runs.map((run) => (
              <HistoryCard key={run.id} run={run} />
            ))}
            
            {runs.length === 0 && (
              <View className="flex-1 items-center justify-center mt-20">
                <Text className="text-gray-400 font-google text-base">No workflow runs found</Text>
              </View>
            )}
          </ScrollView>
        )}
        <Text className="text-gray-400 font-google text-base">
          History screen coming soon...
        </Text>
      </View>
    </SafeAreaView>
  );
}
