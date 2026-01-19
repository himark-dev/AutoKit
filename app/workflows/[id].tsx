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
      if (!jsonValue) return;
      const savedData = JSON.parse(jsonValue);

      nodesStore.modify((val) => {
        'worklet';
        // clear and rewrite
        for (const k in val) delete val[k];
        Object.assign(val, savedData.coords);
        return val;
      });

      setNodes(savedData.nodes);
      setLinks(savedData.links);
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
      const dataToSave = { nodes, links, coords: nodesStore.value };
      await AsyncStorage.setItem(`@workflow_${id}`, JSON.stringify(dataToSave));
      alert('Graph is saved!');
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
