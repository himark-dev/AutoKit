// app/workflows/index.tsx
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Play, Clock, Pause, Plus, Trash2 } from "lucide-react-native";
import { useState, useEffect } from "react";
import { WorkflowDB, Workflow, HistoryDB } from "@/lib/database";

// Шаблон для нового workflow
const DEFAULT_WORKFLOW_TEMPLATE = {
  title: "New Workflow",
  description: "Custom workflow description",
  lastRun: "Never",
  nodeCount: 0,
  graph: {nodes: [], links: [], coords: {}}
};

interface WorkflowCardProps {
  workflow: Workflow;
  onDelete: (id: string) => void;
  onPlay: (workflow: Workflow) => Promise<void>;
}

const WorkflowCard = ({ workflow, onDelete, onPlay }: WorkflowCardProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const { title, description, lastRun, nodeCount } = workflow.data;
  const router = useRouter();

  const handleCardPress = () => {
    // Навигация на страницу редактирования
    router.push(`/workflows/${workflow.id}`);
  };

  const handlePlayPress = async () => {
    setIsRunning(true);
    await onPlay(workflow);
    setIsRunning(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Workflow",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => onDelete(workflow.id) 
        }
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
            onPress={handlePlayPress}
            disabled={isRunning}
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
      const data = await WorkflowDB.getAll();
      setWorkflows(data);
    } catch (error) {
      console.error('Error loading workflows:', error);
      Alert.alert("Error", "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  // ФУНКЦИЯ ДОБАВЛЕНИЯ НОВОГО WORKFLOW
  const addWorkflow = async () => {
    try {
      const newWorkflowData = { ...DEFAULT_WORKFLOW_TEMPLATE };
      newWorkflowData.title = `New Workflow ${workflows.length + 1}`;
      
      const id = await WorkflowDB.add(newWorkflowData);
      
      // Обновляем список без перезагрузки всего
      const newWorkflow: Workflow = {
        id,
        name: newWorkflowData.title,
        json: JSON.stringify(newWorkflowData),
        status: 'ENABLED',
        data: newWorkflowData
      };
      
      setWorkflows([newWorkflow, ...workflows]);
      
      Alert.alert(
        "Success", 
        `Workflow "${newWorkflowData.title}" created successfully!`,
        [
          { 
            text: "Edit", 
            onPress: () => router.push(`/workflows/${id}`) 
          },
          { 
            text: "OK", 
            style: "default" 
          }
        ]
      );
      
    } catch (error: any) {
      console.error('Error adding workflow:', error);
      Alert.alert("Error", error.message || "Failed to create workflow");
    }
  };

  // Запуск workflow и добавление записи в history
  const handlePlayWorkflow = async (workflow: Workflow) => {
    try {
      // Создаем запись в history со статусом RUNNING
      const runId = await HistoryDB.add(
        workflow.id,
        'RUNNING',
        `Starting workflow: ${workflow.name}\nTimestamp: ${new Date().toISOString()}`
      );

      // Имитация выполнения workflow
      setTimeout(async () => {
        try {
          const success = Math.random() > 0.3;
          const status = success ? 'SUCCESS' : 'ERROR';
          const log = success 
            ? `Workflow ${workflow.name} completed successfully\nExecution time: 2.5s\nResults: Processed 3 nodes`
            : `Workflow ${workflow.name} failed\nError: Timeout on node 2\nRetry attempt: 1/3`;

          await HistoryDB.updateRunStatus(runId, status, log);
        } catch (error) {
          console.error('Error updating run status:', error);
        }
      }, 2500);

      Alert.alert(
        "Workflow Started",
        `Workflow "${workflow.name}" is now running. Check History tab for details.`,
        [{ text: "OK" }]
      );

    } catch (error) {
      console.error('Error starting workflow:', error);
      Alert.alert("Error", "Failed to start workflow");
    }
  };

  // Удаление workflow
  const deleteWorkflow = async (id: string) => {
    try {
      // Сначала удаляем связанные записи из history
      await HistoryDB.deleteByWorkflowId(id);
      
      // Затем удаляем сам workflow
      await WorkflowDB.delete(id);
      
      // Обновляем список
      setWorkflows(workflows.filter(w => w.id !== id));
      
      Alert.alert("Success", "Workflow deleted successfully");
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
                onPlay={handlePlayWorkflow}
              />
            ))}
            
            {workflows.length === 0 && (
              <View className="flex-1 items-center justify-center mt-20">
                <Text className="text-gray-400 font-google text-base mb-4">No workflows found</Text>
                <TouchableOpacity 
                  className="bg-blue-500/20 px-6 py-3 rounded-xl"
                  onPress={addWorkflow}
                >
                  <Text className="text-blue-400 font-google text-base">Create First Workflow</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}