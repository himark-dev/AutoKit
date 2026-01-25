// app/workflows/[id].tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, ActivityIndicator, StatusBar, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WorkflowDB, HistoryDB } from '@/lib/database';
import GraphApp from '@/src/components/graph/graph';
import { useSharedValue } from 'react-native-reanimated';

export default function WorkflowEditor() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', json: '' });

  // nodes и links для React рендера
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

  // nodesStore для хранения координат внутри GraphApp
  const nodesStore = useSharedValue({});

  // Загрузка workflow при монтировании
  useEffect(() => {
    if (id === 'new') {
      router.replace('/workflows');
      return;
    }
    loadWorkflow();
  }, [id]);

  const loadWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      const data = await WorkflowDB.getById(id as string);
      if (data) {
        setWorkflow(data);
        const parsed = JSON.parse(data.json);
        nodesStore.modify((val) => {
          'worklet';
          for (const k in val) delete val[k];
          Object.assign(val, parsed.graph.coords.value);
          return val;
        });
        setNodes(parsed.graph.nodes);
        setLinks(parsed.graph.links);
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
  }, [nodesStore, id]);

  const saveWorkflow = useCallback(async () => {
    try {
      setSaving(true);
      let workflowData;
      try {
        workflowData = JSON.parse(formData.json);
        workflowData.graph.nodes = nodes;
        workflowData.graph.links = links;
        workflowData.graph.coords = nodesStore;
        workflowData.nodeCount = nodes.length;
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
  }, [nodes, links, nodesStore, workflow, formData, id]);

  const runWorkflow = async () => {
    if (!workflow) return;
    try {
      const runId = await HistoryDB.add(
        workflow.id,
        'RUNNING',
        `Starting workflow from editor: ${workflow.title}\nTimestamp: ${new Date().toISOString()}`
      );

      setTimeout(async () => {
        try {
          await HistoryDB.updateRunStatus(
            runId,
            'SUCCESS',
            `Workflow ${workflow.title} executed from editor\nExecution time: 1.8s\nStatus: Success`
          );
        } catch (error) {
          console.error('Error updating run:', error);
        }
      }, 1800);

      Alert.alert('Workflow Started', 'Workflow is now running. Check History tab for details.');
    } catch (error) {
      console.error('Error running workflow:', error);
      Alert.alert('Error', 'Failed to start workflow');
    }
  };

  // Удаление workflow
  const deleteWorkflow = () => {
    if (!workflow) return;
    Alert.alert(
      'Delete Workflow',
      `Are you sure you want to delete "${workflow.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await WorkflowDB.delete(workflow.id);
              Alert.alert('Success', 'Workflow deleted');
              router.back();
            } catch (error) {
              console.error('Error deleting workflow:', error);
              Alert.alert('Error', 'Failed to delete workflow');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#131314', justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator size="large" color="#8ab4f8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111' }}>
      <StatusBar barStyle="light-content" />
      <GraphApp
        nodes={nodes}
        setNodes={setNodes}
        links={links}
        setLinks={setLinks}
        nodesStore={nodesStore}
        onSave={saveWorkflow}
        onRun={runWorkflow}
        onDelete={deleteWorkflow}
        saving={saving}
      />
    </SafeAreaView>
  );
}
