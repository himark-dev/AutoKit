import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Switch, StyleSheet, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { NativeModules } from 'react-native';

const { DatabaseModule, Workflow } = NativeModules;

const WorkflowEditor = () => {
  const [loading, setLoading] = useState(true);
  const [wf, setWf] = useState({
    id: '',
    name: '',
    json: '',
    status: 'DISABLED' // Используем строку, так как в базе WorkflowStatus (Enum)
  });

  useEffect(() => {
    loadFirstWorkflow();
  }, []);

  const loadFirstWorkflow = async () => {
    try {
      const workflows = await DatabaseModule.getAllWorkflows();
      if (workflows && workflows.length > 0) {
        setWf(workflows[0]);
      } else {
        // Если базы пуста, создаем начальный стейт
        setWf(prev => ({ ...prev, id: '' }));
      }
    } catch (e) {
      Alert.alert("Ошибка загрузки", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Валидация JSON перед отправкой в натив
      JSON.parse(wf.json);
      
      const savedId = await DatabaseModule.upsertWorkflow(
        wf.id,
        wf.name,
        wf.json,
        wf.status
      );
      
      setWf(prev => ({ ...prev, id: savedId }));
      Alert.alert("Успех", "Конфигурация сохранена");
    } catch (e) {
      Alert.alert("Ошибка сохранения", `Проверьте формат JSON или статус ${e}`);
    }
  };

  const handleRun = () => {
    if (!wf.id) {
      Alert.alert("Ошибка", "Сначала сохраните воркфлоу");
      return;
    }
    Workflow.triggerManual(wf.id);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Управление Workflow</Text>
        
        <View style={styles.card}>
          <Text style={styles.label}>Название</Text>
          <TextInput
            style={styles.input}
            value={wf.name}
            onChangeText={text => setWf({ ...wf, name: text })}
            placeholder="Напр: Авто-свет"
          />

          <View style={styles.row}>
            <Text style={styles.label}>Статус: {wf.status}</Text>
            <Switch
              value={wf.status === 'ENABLED'}
              onValueChange={val => setWf({ ...wf, status: val ? 'ENABLED' : 'DISABLED' })}
            />
          </View>

          <Text style={styles.label}>Конфигурация (JSON)</Text>
          <TextInput
            style={[styles.input, styles.code]}
            multiline
            value={wf.json}
            onChangeText={text => setWf({ ...wf, json: text })}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />

          <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
            <Text style={styles.btnText}>Сохранить в базу</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnRun} onPress={handleRun}>
          <Text style={styles.btnText}>⚡ Запустить (MANUAL)</Text>
        </TouchableOpacity>
        
        <Text style={styles.footer}>ID: {wf.id || 'Новый воркфлоу'}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  card: { backgroundColor: '#1E1E1E', padding: 15, borderRadius: 12, marginBottom: 20 },
  label: { color: '#bbb', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#2C2C2C', color: '#fff', borderRadius: 6, padding: 12, marginBottom: 15 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', height: 250, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  btnSave: { backgroundColor: '#3d5afe', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnRun: { backgroundColor: '#00c853', padding: 18, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footer: { color: '#666', textAlign: 'center', marginTop: 10, fontSize: 12 }
});

export default WorkflowEditor;