// app/workflows/[id].tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Save, Play, Trash2 } from 'lucide-react-native';
import { WorkflowDB, HistoryDB } from '@/lib/database';

const DEFAULT_WORKFLOW_TEMPLATE = {
  title: "New Workflow",
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

export default function WorkflowEditor() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    json: ''
  });

  // Загрузка workflow
  useEffect(() => {
    if (id === 'new') {
      // Редирект на главную страницу workflows
      router.replace('/workflows');
      return;
    }
    
    loadWorkflow();
  }, [id]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const data = await WorkflowDB.getById(id as string);
      if (data) {
        setWorkflow(data);
        setFormData({
          name: data.name,
          json: data.json
        });
      } else {
        Alert.alert("Error", "Workflow not found");
        router.back();
      }
    } catch (error) {
      console.error('Error loading workflow:', error);
      Alert.alert("Error", "Failed to load workflow");
    } finally {
      setLoading(false);
    }
  };

  // Сохранение workflow
  const saveWorkflow = async () => {
    try {
      setSaving(true);
      
      let workflowData;
      try {
        workflowData = JSON.parse(formData.json);
      } catch (error: any) {
        Alert.alert("Invalid JSON", `Error: ${error.message}`);
        return;
      }

      // Проверяем обязательные поля
      if (!workflowData.title && !formData.name) {
        Alert.alert("Missing Title", "Please provide a workflow name");
        return;
      }
      
      if (!workflowData.graph) {
        Alert.alert("Invalid Workflow", "Workflow must contain a graph");
        return;
      }

      const workflowName = formData.name || workflowData.title || 'New Workflow';
      
      await WorkflowDB.update(id as string, {
        ...workflowData,
        title: workflowName
      });
      
      Alert.alert("Success", "Workflow updated successfully");
      
      // Обновляем локальное состояние
      setWorkflow({
        ...workflow,
        name: workflowName,
        json: JSON.stringify(workflowData, null, 2)
      });
      
    } catch (error: any) {
      console.error('Error saving workflow:', error);
      Alert.alert("Error", error.message || "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  // Запуск workflow
  const runWorkflow = async () => {
    if (!workflow) return;
    
    try {
      const runId = await HistoryDB.add(
        workflow.id,
        'RUNNING',
        `Starting workflow from editor: ${workflow.name}\nTimestamp: ${new Date().toISOString()}`
      );

      // Имитация выполнения
      setTimeout(async () => {
        try {
          await HistoryDB.updateRunStatus(
            runId, 
            'SUCCESS', 
            `Workflow ${workflow.name} executed from editor\nExecution time: 1.8s\nStatus: Success`
          );
        } catch (error) {
          console.error('Error updating run:', error);
        }
      }, 1800);

      Alert.alert(
        "Workflow Started",
        `Workflow is now running. Check History tab for details.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error running workflow:', error);
      Alert.alert("Error", "Failed to start workflow");
    }
  };

  // Удаление workflow
  const deleteWorkflow = () => {
    if (!workflow) return;
    
    Alert.alert(
      "Delete Workflow",
      `Are you sure you want to delete "${workflow.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await WorkflowDB.delete(workflow.id);
              Alert.alert("Success", "Workflow deleted");
              router.back();
            } catch (error) {
              console.error('Error deleting workflow:', error);
              Alert.alert("Error", "Failed to delete workflow");
            }
          }
        }
      ]
    );
  };

  // Валидация JSON
  const handleJsonChange = (text: string) => {
    setFormData({...formData, json: text});
  };

  // Предпросмотр JSON
  const previewJson = () => {
    try {
      const parsed = JSON.parse(formData.json);
      Alert.alert(
        "JSON Preview",
        "JSON is valid. Structure:\n" + 
        `- Title: ${parsed.title || 'Not set'}\n` +
        `- Description: ${parsed.description || 'Not set'}\n` +
        `- Nodes: ${parsed.graph?.nodes?.length || 0}\n` +
        `- Links: ${parsed.graph?.links?.length || 0}`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      Alert.alert(
        "Invalid JSON", 
        `Error: ${error.message}`,
        [{ text: "OK" }]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8ab4f8" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
      <View className="flex-1 bg-google-bg px-6">
        {/* Заголовок */}
        <View className="flex-row items-center justify-between mb-6 mt-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
            <Text className="text-white font-google text-xl">
              {workflow?.name || 'Edit Workflow'}
            </Text>
          </View>
          
          <View className="flex-row">
            <TouchableOpacity 
              className="w-10 h-10 bg-blue-500/20 rounded-xl items-center justify-center mr-2"
              onPress={runWorkflow}
            >
              <Play color="#8ab4f8" size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-10 h-10 bg-red-500/20 rounded-xl items-center justify-center mr-2"
              onPress={deleteWorkflow}
            >
              <Trash2 color="#ef4444" size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-10 h-10 bg-green-500/20 rounded-xl items-center justify-center"
              onPress={saveWorkflow}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <Save color="#22c55e" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Форма редактирования */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-400 font-google text-sm">Workflow Name</Text>
              <TouchableOpacity 
                className="bg-blue-500/20 px-3 py-1 rounded-lg"
                onPress={previewJson}
              >
                <Text className="text-blue-400 font-google text-xs">Preview JSON</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className="bg-google-card text-white font-google p-3 rounded-xl"
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="Enter workflow name"
              placeholderTextColor="#6b7280"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-400 font-google text-sm mb-2">Workflow JSON</Text>
            <TextInput
              className="bg-google-card text-white font-google p-3 rounded-xl min-h-[400px]"
              value={formData.json}
              onChangeText={handleJsonChange}
              placeholder="Enter workflow JSON"
              placeholderTextColor="#6b7280"
              multiline
              textAlignVertical="top"
              style={{ height: 400 }}
            />
          </View>

          <View className="mb-8">
            <Text className="text-gray-500 font-google text-xs mb-2">
              Required JSON structure:
            </Text>
            <View className="bg-gray-900/50 p-3 rounded-lg">
              <Text className="text-gray-400 font-google text-xs font-mono">
                {"{\n" +
                '  "title": "Workflow Name",\n' +
                '  "description": "Description",\n' +
                '  "lastRun": "Never",\n' +
                '  "nodeCount": 3,\n' +
                '  "graph": {\n' +
                '    "nodes": [\n' +
                '      {"id": "1", "type": "start", "label": "Start", "x": 100, "y": 200}\n' +
                '    ],\n' +
                '    "links": [\n' +
                '      {"source": "1", "target": "2"}\n' +
                '    ],\n' +
                '    "coords": {\n' +
                '      "1": {"x": 100, "y": 200}\n' +
                '    }\n' +
                '  }\n' +
                "}"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}