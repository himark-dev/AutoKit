import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Play, Clock, Pause, Plus, Trash2 } from "lucide-react-native";
import { useState, useEffect } from "react";
import { WorkflowDB, Workflow } from "@/lib/database";

interface WorkflowCardProps {
  workflow: Workflow;
  onDelete: (id: string) => void;
}

const WorkflowCard = ({ workflow, onDelete }: WorkflowCardProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const { title, description, lastRun, nodeCount } = workflow.data;

  const handleCardPress = async () => {
    // Получаем данные из БД при клике
    const dbWorkflow = await WorkflowDB.getById(workflow.id);
    if (dbWorkflow) {
      Alert.alert(
        "Workflow Data",
        JSON.stringify(dbWorkflow.data, null, 2),
        [{ text: "OK" }]
      );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Workflow",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(workflow.id) }
      ]
    );
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={handleCardPress}
      className="bg-google-card mb-4 p-4 rounded-2xl"
    >
      <View className="flex-row">
        {/* Мини-карта графа */}
        <View className="w-16 h-16 bg-gray-800 rounded-xl mr-4 items-center justify-center">
          <View className="flex-row items-center space-x-1">
            <View className="w-2 h-2 bg-blue-400 rounded-full" />
            <View className="w-1 h-px bg-gray-500" />
            <View className="w-2 h-2 bg-green-400 rounded-full" />
          </View>
          <View className="w-1 h-2 bg-gray-500 mt-1" />
          <View className="w-2 h-2 bg-orange-400 rounded-full" />
        </View>
        
        {/* Контент */}
        <View className="flex-1">
          <Text className="text-white font-google text-lg mb-1">{title}</Text>
          <Text className="text-gray-400 font-google text-sm mb-2">{description}</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Clock color="#6b7280" size={14} />
              <Text className="text-gray-500 font-google text-xs ml-1">{lastRun}</Text>
            </View>
            <Text className="text-gray-500 font-google text-xs">{nodeCount} nodes</Text>
          </View>
        </View>
        
        {/* Кнопки */}
        <View className="flex-row items-center ml-2">
          <TouchableOpacity 
            className="w-10 h-10 bg-blue-500/20 rounded-xl items-center justify-center mr-2"
            onPress={() => setIsRunning(!isRunning)}
          >
            {isRunning ? (
              <Pause color="#8ab4f8" size={16} />
            ) : (
              <Play color="#8ab4f8" size={16} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="w-10 h-10 bg-red-500/20 rounded-xl items-center justify-center"
            onPress={handleDelete}
          >
            <Trash2 color="#ef4444" size={16} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function Workflows() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка workflows из БД
  const loadWorkflows = async () => {
    try {
      setLoading(true);
      await WorkflowDB.forceInit(); // Принудительное обновление данных
      const data = await WorkflowDB.getAll();
      setWorkflows(data);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  // Добавление нового workflow
  const addWorkflow = async () => {
    try {
      const newWorkflowData = {
        title: `New Workflow ${workflows.length + 1}`,
        description: "Custom workflow description",
        lastRun: "Never",
        nodeCount: 3,
        graph: {
          nodes: [
            { id: "1", type: "start", label: "Start", x: 100, y: 200 },
            { id: "2", type: "process", label: "Process", x: 300, y: 200 },
            { id: "3", type: "end", label: "End", x: 500, y: 200 }
          ],
          links: [
            { source: "1", target: "2" },
            { source: "2", target: "3" }
          ],
          coords: {
            "1": { x: 100, y: 200 },
            "2": { x: 300, y: 200 },
            "3": { x: 500, y: 200 }
          }
        }
      };
      
      await WorkflowDB.add(newWorkflowData);
      await loadWorkflows(); // Перезагружаем список
    } catch (error) {
      console.error('Error adding workflow:', error);
      Alert.alert("Error", "Failed to add workflow");
    }
  };

  // Удаление workflow
  const deleteWorkflow = async (id: string) => {
    try {
      await WorkflowDB.delete(id);
      await loadWorkflows(); // Перезагружаем список
    } catch (error) {
      console.error('Error deleting workflow:', error);
      Alert.alert("Error", "Failed to delete workflow");
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
      <View className="flex-1 bg-google-bg px-6">
        <View className="flex-row items-center justify-between mb-6 mt-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
            <Text className="text-white font-google text-xl">Workflows</Text>
          </View>
          
          <TouchableOpacity 
            className="w-10 h-10 bg-green-500/20 rounded-xl items-center justify-center"
            onPress={addWorkflow}
          >
            <Plus color="#22c55e" size={20} />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-400 font-google text-base">Loading workflows...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onDelete={deleteWorkflow}
              />
            ))}
            
            {workflows.length === 0 && (
              <View className="flex-1 items-center justify-center mt-20">
                <Text className="text-gray-400 font-google text-base mb-4">No workflows found</Text>
                <TouchableOpacity 
                  className="bg-blue-500/20 px-6 py-3 rounded-xl"
                  onPress={addWorkflow}
                >
                  <Text className="text-blue-400 font-google text-base">Add First Workflow</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
