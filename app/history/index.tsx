// app/history.tsx
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, Trash2, Play } from "lucide-react-native";
import { useState, useEffect } from "react";
import { HistoryDB, WorkflowRun } from "@/lib/database";

interface HistoryCardProps {
  run: WorkflowRun;
  onDelete: (id: string) => void;
  onRunAgain: (workflowId: string) => void;
}

const HistoryCard = ({ run, onDelete, onRunAgain }: HistoryCardProps) => {
  const formatDuration = () => {
    if (run.end === 0) return "Running...";
    
    const seconds = Math.floor((run.end - run.start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '#22c55e';
      case 'ERROR': return '#ef4444';
      case 'RUNNING': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle color="#22c55e" size={16} />;
      case 'ERROR': return <XCircle color="#ef4444" size={16} />;
      case 'RUNNING': return <Clock color="#3b82f6" size={16} />;
      default: return <Clock color="#6b7280" size={16} />;
    }
  };

  const showLog = () => {
    Alert.alert(
      `Log - ${run.workflowName || 'Workflow'}`,
      run.log,
      [{ text: "Close" }],
      { userInterfaceStyle: 'dark' }
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete History Record",
      "Are you sure you want to delete this history record?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(run.id) }
      ]
    );
  };

  return (
    <View className="bg-google-card mb-4 p-4 rounded-2xl">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-white font-google text-lg mb-1">
            {run.workflowName || `Workflow ${run.workflowId.slice(0, 8)}`}
          </Text>
          <Text className="text-gray-400 font-google text-sm">Run ID: {run.id.slice(0, 8)}...</Text>
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
            {formatDate(run.start)}
          </Text>
        </View>
        
        <Text className="text-gray-500 font-google text-xs">
          Duration: {formatDuration()}
        </Text>
      </View>
      
      <View className="flex-row justify-between items-center">
        <View className="flex-row">
          <TouchableOpacity 
            className="flex-row items-center bg-blue-500/20 px-3 py-2 rounded-xl mr-2"
            onPress={showLog}
          >
            <FileText color="#8ab4f8" size={14} />
            <Text className="text-blue-400 font-google text-xs ml-1">View Log</Text>
          </TouchableOpacity>
          
          {run.status !== 'RUNNING' && (
            <TouchableOpacity 
              className="flex-row items-center bg-green-500/20 px-3 py-2 rounded-xl"
              onPress={() => onRunAgain(run.workflowId)}
            >
              <Play color="#22c55e" size={14} />
              <Text className="text-green-400 font-google text-xs ml-1">Run Again</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          className="w-10 h-10 bg-red-500/20 rounded-xl items-center justify-center"
          onPress={handleDelete}
        >
          <Trash2 color="#ef4444" size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function History() {
  const router = useRouter();
  const [historyRuns, setHistoryRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await HistoryDB.getAll();
      // Сортируем по времени (новые сверху)
      const sortedData = data.sort((a, b) => b.start - a.start);
      setHistoryRuns(sortedData);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert("Error", "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryRecord = async (id: string) => {
    try {
      await HistoryDB.delete(id);
      await loadHistory();
      Alert.alert("Success", "History record deleted");
    } catch (error) {
      console.error('Error deleting history record:', error);
      Alert.alert("Error", "Failed to delete history record");
    }
  };

  const runWorkflowAgain = async (workflowId: string) => {
    try {
      // Здесь можно добавить логику для повторного запуска workflow
      // Пока просто показываем сообщение
      Alert.alert(
        "Info", 
        "This would re-run the workflow. In a real app, this would execute the workflow again.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error running workflow again:', error);
    }
  };

  const clearAllHistory = () => {
    if (historyRuns.length === 0) return;
    
    Alert.alert(
      "Clear All History",
      "Are you sure you want to delete all history records?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive", 
          onPress: async () => {
            try {
              await HistoryDB.clearAll();
              await loadHistory();
              Alert.alert("Success", "All history cleared");
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert("Error", "Failed to clear history");
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadHistory();
    
    // Обновляем каждые 5 секунд для отображения изменений в реальном времени
    const interval = setInterval(() => {
      loadHistory();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
      <View className="flex-1 bg-google-bg px-6">
        <View className="flex-row items-center justify-between mb-6 mt-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
            <Text className="text-white font-google text-xl">History</Text>
          </View>
          
          {historyRuns.length > 0 && (
            <TouchableOpacity 
              className="w-10 h-10 bg-red-500/20 rounded-xl items-center justify-center"
              onPress={clearAllHistory}
            >
              <Trash2 color="#ef4444" size={20} />
            </TouchableOpacity>
          )}
        </View>
        
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#8ab4f8" />
            <Text className="text-gray-400 font-google text-base mt-4">Loading history...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {historyRuns.map((run) => (
              <HistoryCard
                key={run.id}
                run={run}
                onDelete={deleteHistoryRecord}
                onRunAgain={runWorkflowAgain}
              />
            ))}
            
            {historyRuns.length === 0 && (
              <View className="flex-1 items-center justify-center mt-20">
                <FileText color="#6b7280" size={48} />
                <Text className="text-gray-400 font-google text-base mt-4 mb-2">No history records yet</Text>
                <Text className="text-gray-500 font-google text-sm text-center px-8">
                  Run a workflow from the Workflows tab to see execution history here.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}