import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';

const { Registry } = NativeModules;

interface NodeDefinition {
  type: string;
  pkg: string;
  name: string;
  icon: string;
  schema: string; // Ожидаем JSON-строку: {"paramName": {"type": "string"}, ...}
}

const RegistryScreen = () => {
  const [nodes, setNodes] = useState<NodeDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const result = await Registry.fetch();
      setNodes(result);
    } catch (error) {
      console.error("Registry Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const renderNode = ({ item }: { item: NodeDefinition }) => {
    const schemaKeys = Object.keys(item.schema);

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Icon name={item.icon || 'help-circle-outline'} size={28} color="#007AFF" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.nodeName}>{item.name || "Unnamed Node"}</Text>
            <Text style={styles.nodePkg} numberOfLines={1}>{item.pkg}</Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>V1</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.schemaContainer}>
          <Text style={styles.schemaLabel}>Параметры ноды</Text>
          <View style={styles.paramsList}>
            {schemaKeys.length > 0 ? (
              schemaKeys.map((key) => (
                <View key={key} style={styles.paramRow}>
                  <Text style={styles.paramName}>{key}</Text>
                  <View style={styles.paramTypeTag}>
                    <Text style={styles.paramTypeText}>{item.schema[key].type}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyParams}>Нет входных параметров</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Registry Explorer</Text>
        <TouchableOpacity onPress={fetchNodes} disabled={loading} style={styles.refreshButton}>
           <Icon name="refresh" size={24} color={loading ? "#ccc" : "#007AFF"} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={nodes}
        keyExtractor={(item) => `${item.pkg}.${item.type}`}
        renderItem={renderNode}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Ноды не найдены</Text> : <ActivityIndicator size="large" style={{marginTop: 50}} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FA' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  refreshButton: { padding: 5 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#F0F7FF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: { flex: 1 },
  nodeName: { fontSize: 18, fontWeight: '700', color: '#2D3436' },
  nodePkg: { fontSize: 13, color: '#A0A0A0', marginTop: 1 },
  typeBadge: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: { fontSize: 11, color: '#636E72', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 15 },
  schemaContainer: {
    marginTop: 2,
  },
  schemaLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#B2BEC3', 
    marginBottom: 10, 
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  paramsList: {
    gap: 8,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  paramName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    fontFamily: 'monospace',
  },
  paramTypeTag: {
    backgroundColor: '#E1E8EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paramTypeText: {
    fontSize: 11,
    color: '#576574',
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  emptyParams: {
    fontSize: 14,
    color: '#B2BEC3',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  empty: { textAlign: 'center', marginTop: 100, color: '#B2BEC3', fontSize: 16 },
});

export default RegistryScreen;