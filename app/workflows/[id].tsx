// app/workflows/[id].tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, ActivityIndicator, StatusBar, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WorkflowDB, HistoryDB } from '@/lib/database';
import GraphApp from '@/src/components/graph/graph';
import { useSharedValue } from 'react-native-reanimated';

import AsyncStorage from '@react-native-async-storage/async-storage';

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
      console.log('=== Loading workflow ===');

      const jsonValue = await AsyncStorage.getItem(`@workflow_${id}`);
      if (!jsonValue) {
        Alert.alert('Error', 'Workflow not found');
        return;
      }

      const data = JSON.parse(jsonValue);

      // // Восстанавливаем координаты в nodesStore
      // nodesStore.modify((val) => {
      //   'worklet';
      //   for (const k in val) delete val[k];
      //   for (const [id, node] of Object.entries(data.graph?.coords || {})) {
      //     val[id] = {
      //       ...node,
      //       x: useSharedValue(node.x),
      //       y: useSharedValue(node.y),
      //     };
      //   }
      //   return val;
      // });

      nodesStore.modify((val) => {
        'worklet';
        for (const k in val) delete val[k];
        for (const [id, node] of Object.entries(data.graph?.coords || {})) {
          val[id] = {
            ...node,
            x: useSharedValue(node.x),
            y: useSharedValue(node.y),
          };
          console.log(`Node ${id} loaded: x=${node.x}, y=${node.y}, type=${node.desc}`);
        }
        return val;
      });

      setWorkflow(data);
      setFormData({ name: data.name || '', json: data.json || '' });
      setNodes(data.graph?.nodes || []);
      setLinks(data.graph?.links || []);

      console.log('Nodes loaded:');
      (data.graph?.nodes || []).forEach(n => console.log(`Node ${n.id}: x=${n.x}, y=${n.y}, graphId=${n.graphId}, type=${n.type}`));
      console.log('Links loaded:', JSON.stringify(data.graph?.links || [], null, 2));
      console.log('Coords loaded:', JSON.stringify(data.graph?.coords || {}, null, 2));

      Alert.alert('Success', 'Workflow loaded!');
    } catch (e) {
      console.error('Error loading workflow:', e);
      Alert.alert('Error', 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  }, [nodesStore, id]);

  // Сохранение workflow
  const saveWorkflow = useCallback(async () => {
    try {
      setSaving(true);
      console.log('=== Saving workflow ===');

      // Формируем graph с реальными координатами
      const graph = {
        nodes: nodes.map(n => {
          const stored = nodesStore.value[n.id];
          const x = stored?.x?.value ?? n.x ?? 0;
          const y = stored?.y?.value ?? n.y?.value ?? 0;

          console.log(`Node ${n.id}: x=${x}, y=${y}, graphId=${n.graphId}, type=${n.type}`);
          return { ...n, x, y };
        }),
        links,
        coords: Object.fromEntries(
          Object.entries(nodesStore.value).map(([id, n]) => [
            id,
            {
              ...n,
              x: n.x?.value ?? 0,
              y: n.y?.value ?? 0,
            }
          ])
        ),
      };

      console.log('Links:', JSON.stringify(links, null, 2));
      console.log('Coords in nodesStore:', JSON.stringify(graph.coords, null, 2));

      const workflowData = {
        ...workflow,
        title: formData.name || workflow?.title || 'New Workflow',
        graph,
        json: formData.json || workflow?.json || '',
      };

      // Сохраняем в AsyncStorage
      await AsyncStorage.setItem(`@workflow_${id}`, JSON.stringify(workflowData));

      // Обновляем локальное состояние
      setWorkflow(workflowData);
      setNodes(graph.nodes);
      setLinks(graph.links);

      Alert.alert('Success', 'Workflow saved!');
    } catch (err: any) {
      console.error('Error saving workflow:', err);
      Alert.alert('Error', err.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  }, [nodes, links, nodesStore, workflow, formData, id]);

  // Запуск workflow
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
