import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, TouchableOpacity, useWindowDimensions, BackHandler, Alert } from 'react-native';
import { Canvas, Group, useFont, Rect as SkiaRect } from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useSharedValue,
  makeMutable,
  clamp,
  withSpring,
  useFrameCallback,
  useAnimatedReaction,
  runOnJS,
  useDerivedValue,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MinimapNode, RenderTempLine, RenderLink, styles } from '@/src/components/graph/RenderFunctions';
import { nodeFactory, NodeRenderer, NodeDefinitionType } from '@/src/components/nodes/nodeFactory';
import { Sidebar } from '@/src/components/interface/sidebar';
import { SelectionRect } from '@/src/components/interface/areaSelection';
import { PORT_RADIUS } from '@/src/components/nodes/Node';
import { NodeMenuOverlay } from '@/src/components/interface/nodeFloatMenu';
import { Play, Eraser, Menu } from 'lucide-react-native';
import {
  MINIMAP_SIZE,
  WORLD_SIZE,
  MIN_SCALE,
  MAX_SCALE,
  EDGE_MARGIN,
  EPSILON_PORT_HITBOX,
  AUTO_PAN_SPEED,
  FONT_SIZE,
  ICON_FONT_SIZE,
  RIGHT_MARGIN,
  OFF,
} from './constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

type Port = { x: number; y: number };
import { NodeData, LinkData } from '@/src/components/nodes/Node';
type NodeType = NodeData
type LinkType = LinkData


type GraphAppProps = {
  nodes: NodeType[];
  setNodes: React.Dispatch<React.SetStateAction<NodeType[]>>;
  links: LinkType[];
  setLinks: React.Dispatch<React.SetStateAction<LinkType[]>>;
  nodesStore: any;
  onSave: () => void;
  onRun?: () => void;
  onDelete?: () => void;
  saving?: boolean;
};

function arraysEqual(a?: string[], b?: string[]) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export default function GraphApp({ nodes, setNodes, links, setLinks, nodesStore, onSave }: GraphAppProps) {
  const MINIMAP_RATIO = MINIMAP_SIZE / WORLD_SIZE;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [activeMenu, setActiveMenu] = useState<any>(null);
  const [activeNodeIdJS, setActiveNodeIdJS] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [visibleNodeIds, setVisibleNodeIds] = useState<string[]>([]);
  const [visibleLinkIds, setVisibleLinkIds] = useState<string[]>([]);

  const [minimapRect, setMinimapRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const onBackPress = () => {
      Alert.alert('Save Workflow?', 'You have unsaved changes', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'No', style: 'destructive', onPress: () => { router.back(); } },
        { text: 'Yes', onPress: () => { onSave(); router.back(); } },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onSave]);

  useEffect(() => {
    if (!nodes || !nodesStore) return;
    nodesStore.modify((val: any) => {
      'worklet';
      const order: string[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        order.push(n.nodeId);
        if (!val[n.nodeId]) {
          val[n.nodeId] = {
            nodeId: n.nodeId,
            x: { value: n.x ?? 0 },
            y: { value: n.y ?? 0 },
            width: n.width ?? 100,
            height: n.height ?? 50,
            type: n.desc,
            graphId: n.graphId ?? null,
            inputPorts: n.inputPorts ?? [],
            outputPorts: n.outputPorts ?? [],
            additionalPorts: n.additionalPorts ?? [],
            isActive: 0,
          };
        } else {
          if (n.x != null) val[n.nodeId].x.value = n.x;
          if (n.y != null) val[n.nodeId].y.value = n.y;
          if (n.width != null) val[n.nodeId].width = n.width;
          if (n.height != null) val[n.nodeId].height = n.height;
        }
      }
      val.__order = order;
      return val;
    });
  }, [nodes, nodesStore]);

  const sidebarX = useSharedValue(-240);
  useEffect(() => {
    sidebarX.value = withTiming(sidebarOpen ? 0 : -240, { duration: 250 });
  }, [sidebarOpen, sidebarX]);
  const sidebarStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sidebarX.value }] }));

  const activeNodeId = useSharedValue<string | null>(null);
  const isConnecting = useSharedValue(false);
  const tempLine = useSharedValue({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const startDragOffset = useSharedValue<Record<string, { x: number; y: number }>>({});
  const sourcePort = useSharedValue<number | null>(null);
  const targetPort = useSharedValue<number | null>(null);
  const additionalPort = useSharedValue<number | null>(null);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const selectedNodeIds = useSharedValue<string[]>([]);
  const linksSV = useSharedValue(links || []);
  const isPinching = useSharedValue(false);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchCenter = useSharedValue({ x: 0, y: 0 });
  const savedScale = useSharedValue(1);
  const selectionRect = useSharedValue({ x1: 0, y1: 0, x2: 0, y2: 0, active: false });
  const startSelectionRect = useSharedValue<any>(null);
  const selectionDragging = useSharedValue(false);
  const autoPanDir = useSharedValue({ x: 0, y: 0 });
  const autoPanAccum = useSharedValue({ x: 0, y: 0 });
  const isAutoPanning = useSharedValue(false);

  useEffect(() => {
    linksSV.value = links;
  }, [links, linksSV]);

  const clampTranslateFromMinimap = useCallback((tx: number, ty: number) => {
    'worklet';
    const s = scale.value || 1;
    const R = MINIMAP_RATIO;
    const C = MINIMAP_SIZE / 2;
    const vw = Math.min((screenWidth / s) * R, MINIMAP_SIZE);
    const vh = Math.min((screenHeight / s) * R, MINIMAP_SIZE);
    const minTX = -((MINIMAP_SIZE - vw - C) / R) * s;
    const maxTX = -((0 - C) / R) * s;
    const minTY = -((MINIMAP_SIZE - vh - C) / R) * s;
    const maxTY = -((0 - C) / R) * s;
    return {
      x: Math.min(Math.max(tx, minTX), maxTX),
      y: Math.min(Math.max(ty, minTY), maxTY),
    };
  }, [screenWidth, screenHeight]);

  useFrameCallback(() => {
    if (!isAutoPanning.value || !activeNodeId.value) return;
    const dx = autoPanDir.value.x;
    const dy = autoPanDir.value.y;
    if (dx === 0 && dy === 0) return;
    const nextX = translateX.value + dx;
    const nextY = translateY.value + dy;
    const clamped = clampTranslateFromMinimap(nextX, nextY);
    const realDX = clamped.x - translateX.value;
    const realDY = clamped.y - translateY.value;
    translateX.value = clamped.x;
    translateY.value = clamped.y;
    autoPanAccum.value = { x: autoPanAccum.value.x + realDX, y: autoPanAccum.value.y + realDY };
    if (realDX === 0) autoPanDir.value.x = 0;
    if (realDY === 0) autoPanDir.value.y = 0;
  });

  const idCounterRef = useRef(0);
  const makeLinkId = useCallback((from: string, to: string, portFrom?: number, portTo?: number, addPort?: number) => {
    idCounterRef.current += 1;
    return `${from}__${to}__${portFrom}__${portTo}__${addPort}__${Date.now()}_${idCounterRef.current}`;
  }, []);

  const mergeGraphs = useCallback((fromId: string, toId: string, portFrom?: number, portTo?: number, addPort?: number) => {
    setLinks(prev => {
      const exists = prev.some(l => l.from === fromId && l.to === toId && l.portFrom === portFrom && l.portTo === portTo && l.additionalPort === addPort);
      if (exists) return prev;
      return [...prev, { id: makeLinkId(fromId, toId, portFrom, portTo, addPort), from: fromId, to: toId, portFrom, portTo, additionalPort: addPort }];
    });

    const targetGraphId = nodesStore.value?.[toId]?.graphId;
    const sourceGraphId = nodesStore.value?.[fromId]?.graphId;
    if (!targetGraphId || !sourceGraphId) return;

    nodesStore.modify((val: any) => {
      'worklet';
      for (const id in val) {
        if (val[id].graphId === sourceGraphId) val[id].graphId = targetGraphId;
      }
      return val;
    });

    setNodes(prev => prev.map(n => (n.graphId === sourceGraphId ? { ...n, graphId: targetGraphId } : n)));
  }, [nodesStore, makeLinkId, setLinks, setNodes]);

  const addNodeOfType = useCallback((type: string) => {
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const graphId = `g_${id}`;
    const initX = (screenWidth / 4 - translateX.value) / (scale.value || 1);
    const initY = (screenHeight / 4 - translateY.value) / (scale.value || 1);
    const xSV = makeMutable(initX);
    const ySV = makeMutable(initY);
    const node = nodeFactory(type as NodeDefinitionType, id, graphId, xSV, ySV);

    nodesStore.modify((val: any) => {
      'worklet';
      val[id] = node;
      if (!val.__order) val.__order = [];
      val.__order.push(id);
      return val;
    });

    setNodes(prev => [...prev, node]);
    setSidebarOpen(false);
  }, [screenWidth, screenHeight, nodesStore]);

  const recalculateGraphIds = useCallback((currentNodes: any[], currentLinks: any[]) => {
    const nodeMap = new Map(currentNodes.map(n => [n.id, { ...n }]));
    const adj = new Map<string, string[]>();
    for (const l of currentLinks) {
      if (!adj.has(l.from)) adj.set(l.from, []);
      if (!adj.has(l.to)) adj.set(l.to, []);
      adj.get(l.from)!.push(l.to);
      adj.get(l.to)!.push(l.from);
    }

    const visited = new Set<string>();
    const result: any[] = [];
    const ts = Date.now();
    let counter = 1;

    for (const startNode of currentNodes) {
      const sid = startNode.id;
      if (visited.has(sid)) continue;
      const newGraphId = `g_n_${ts}_${counter++}`;
      const queue = [sid];
      visited.add(sid);
      while (queue.length) {
        const nid = queue.shift()!;
        const node = nodeMap.get(nid);
        if (node) result.push({ ...node, graphId: newGraphId });
        const neighbors = adj.get(nid) || [];
        for (const nb of neighbors) {
          if (!visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        }
      }
    }

    for (const n of currentNodes) {
      if (!result.find(r => r.id === n.id)) result.push({ ...n, graphId: `g_n_${ts}_${counter++}` });
    }

    return result;
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setLinks(prevLinks => {
      const updatedLinks = prevLinks.filter(l => l.from !== nodeId && l.to !== nodeId);
      setNodes(prevNodes => {
        const updatedNodes = prevNodes.filter(n => n.nodeId !== nodeId);
        const newNodes = recalculateGraphIds(updatedNodes, updatedLinks);
        nodesStore.modify((val: any) => {
          'worklet';
          if (val[nodeId]) delete val[nodeId];
          if (val.__order) {
            val.__order = val.__order.filter((id: string) => id !== nodeId);
          }
          for (const node of newNodes) {
            if (val[node.id]) val[node.id].graphId = node.graphId;
          }
          return val;
        });
        return newNodes;
      });
      return updatedLinks;
    });
  }, [recalculateGraphIds, nodesStore]);

  const clearGraph = useCallback(() => {
    Alert.alert('Clear Graph?', 'Are you sure you want to remove all nodes and links?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: () => {
          setLinks([]);
          setNodes([]);
          nodesStore.modify((val: any) => {
            'worklet';
            for (const key in val) delete val[key];
            val.__order = [];
            return val;
          });
          activeNodeId.value = null;
          selectedNodeIds.value = [];
          selectionRect.value = { x1: 0, y1: 0, x2: 0, y2: 0, active: false };
          tempLine.value = { x1: 0, y1: 0, x2: 0, y2: 0 };
          isConnecting.value = false;
        }
      }
    ]);
  }, [nodesStore, setNodes, setLinks]);

  const runGraph = useCallback(() => {
    Alert.alert('Run Graph?', 'Are you sure you want to run the graph?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Run', onPress: () => { /* запускаем */ } }]);
  }, []);

  const handleDisconnect = useCallback((targetNodeId: string, portIndex: number, portType: number, currentX: number, currentY: number) => {
    setLinks(prev => {
      const existingLinkIndex = prev.findIndex(link => link.to === targetNodeId && link.portTo === portIndex && link.additionalPort === portType);
      if (existingLinkIndex === -1) return prev;
      const link = prev[existingLinkIndex];
      const sourceNode = nodesStore.value[link.from];
      if (sourceNode && sourceNode.outputPorts) {
        const sPort = sourceNode.outputPorts[link.portFrom!];
        if (sPort) {
          tempLine.value = { x1: sourceNode.x.value + sPort.x, y1: sourceNode.y.value + sPort.y, x2: currentX, y2: currentY };
          activeNodeId.value = link.from;
          sourcePort.value = link.portFrom ?? null;
          isConnecting.value = true;
          return prev.filter((_, i) => i !== existingLinkIndex);
        }
      }
      return prev;
    });
  }, [nodesStore]);

  const visibleNodeIdsSV = useDerivedValue(() => {
    'worklet';
    const val = nodesStore.value || {};
    const order: string[] = val.__order || [];
    const s = scale.value || 1;
    const tx = translateX.value;
    const ty = translateY.value;
    const pad = 100;
    const left = (-tx) / s - pad;
    const top = (-ty) / s - pad;
    const right = left + (screenWidth / s) + pad * 2;
    const bottom = top + (screenHeight / s) + pad * 2;

    const res: string[] = [];
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      const n = val[id];
      if (!n) continue;
      if (n.x.value + n.width >= left && n.x.value <= right && n.y.value + n.height >= top && n.y.value <= bottom) {
        res.push(id);
      }
    }
    return res;
  });

  const updateVisibleNodeIds = useCallback((ids?: string[]) => {
    setVisibleNodeIds(prev => {
      if (arraysEqual(prev, ids || [])) return prev;
      return ids || [];
    });
  }, []);

  useAnimatedReaction(
    () => visibleNodeIdsSV.value,
    (ids) => {
      runOnJS(updateVisibleNodeIds)(ids || []);
    }
  );

  useEffect(() => {
    if (!visibleNodeIds || visibleNodeIds.length === 0) {
      setVisibleLinkIds([]);
      return;
    }
    const visSet = new Set(visibleNodeIds);
    const vlinks = links.filter(l => visSet.has(l.from) || visSet.has(l.to)).map(l => l.id);
    setVisibleLinkIds(vlinks);
  }, [visibleNodeIds, links]);

  const nodeGestures = useMemo(() => {
    const pan = Gesture.Pan()
      .maxPointers(1)
      .onBegin((e) => {
        runOnJS(setSidebarOpen)(false);
        autoPanAccum.value = { x: 0, y: 0 };
        isConnecting.value = false;
        const adjX = (e.x - translateX.value) / scale.value;
        const adjY = (e.y - translateY.value) / scale.value;
        const store = nodesStore.value || {};
        selectionDragging.value = false;
        let hitId: string | null = null;

        const vis = visibleNodeIdsSV.value || [];
        for (let vi = vis.length - 1; vi >= 0; vi--) {
          const id = vis[vi];
          const n = store[id];
          if (!n) continue;
          if (adjX >= n.x.value && adjX <= n.x.value + n.width && adjY >= n.y.value && adjY <= n.y.value + n.height) {
            hitId = id;
            if (store[id]) store[id].isActive = 1;
            break;
          }
        }

        if (!hitId || selectionRect.value.active) {
          const s = selectionRect.value;
          const minX = Math.min(s.x1, s.x2);
          const maxX = Math.max(s.x1, s.x2);
          const minY = Math.min(s.y1, s.y2);
          const maxY = Math.max(s.y1, s.y2);
          if (adjX >= minX && adjX <= maxX && adjY >= minY && adjY <= maxY) {
            selectionDragging.value = true;
            hitId = selectedNodeIds.value && selectedNodeIds.value.length ? selectedNodeIds.value[0] : null;
          }
        }

        if (hitId) {
          activeNodeId.value = hitId;
          runOnJS(setActiveNodeIdJS)(hitId);
          const n = store[hitId];

          let foundOutput = false;
          for (let p = 0; p < (n.outputPorts?.length || 0); p++) {
            const port = n.outputPorts[p];
            const portX = n.x.value + port.x;
            const portY = n.y.value + port.y;
            const hitbox = adjX > (portX - PORT_RADIUS) && adjX < (portX + PORT_RADIUS) && adjY > (portY - PORT_RADIUS - EPSILON_PORT_HITBOX) && adjY < (portY + PORT_RADIUS + EPSILON_PORT_HITBOX);
            if (hitbox) {
              sourcePort.value = p;
              isConnecting.value = true;
              tempLine.value = { x1: portX, y1: portY, x2: adjX, y2: adjY };
              foundOutput = true;
              break;
            }
          }
          if (foundOutput) return;

          const inputGroups = [{ ports: n.inputPorts || [], type: 0 }, { ports: n.additionalPorts || [], type: 1 }];
          let foundInput = false;
          for (const group of inputGroups) {
            for (let pi = 0; pi < group.ports.length; pi++) {
              const port = group.ports[pi];
              const portX = n.x.value + port.x;
              const portY = n.y.value + port.y;
              const distSq = (adjX - portX) * (adjX - portX) + (adjY - portY) * (adjY - portY);
              if (distSq <= PORT_RADIUS * PORT_RADIUS) {
                const hasLink = linksSV.value.some((l: any) => l.to === hitId && l.portTo === pi && l.additionalPort === group.type);
                if (hasLink) {
                  runOnJS(handleDisconnect)(hitId, pi, group.type, adjX, adjY);
                  foundInput = true;
                }
                break;
              }
            }
            if (foundInput) break;
          }
          if (foundInput) return;

          if (!isConnecting.value) {
            if (!selectedNodeIds.value.includes(hitId) || selectedNodeIds.value.length <= 1) {
              selectedNodeIds.value = [hitId];
              selectionRect.value = { x1: 0, y1: 0, x2: 0, y2: 0, active: false };
            }

            const offsets: Record<string, { x: number; y: number }> = {};
            selectedNodeIds.value.forEach(id => {
              if (store[id]) offsets[id] = { x: store[id].x.value, y: store[id].y.value };
            });
            startDragOffset.value = offsets;

            if (selectionDragging.value) startSelectionRect.value = { ...selectionRect.value };
          }
        } else {
          activeNodeId.value = null;
          selectedNodeIds.value = [];
          selectionRect.value = { x1: adjX, y1: adjY, x2: adjX, y2: adjY, active: true };
          selectionDragging.value = false;
        }
      })
      .onUpdate((e) => {
        runOnJS(setActiveMenu)(null);
        const adjX = (e.x - translateX.value) / scale.value;
        const adjY = (e.y - translateY.value) / scale.value;

        if (selectionRect.value.active && !selectionDragging.value) {
          selectionRect.value = { ...selectionRect.value, x2: adjX, y2: adjY };
          return;
        }

        if (isConnecting.value) {
          tempLine.value = { ...tempLine.value, x2: adjX, y2: adjY };
          return;
        }

        if (activeNodeId.value) {
          let panX = 0;
          let panY = 0;
          if (e.x < EDGE_MARGIN) panX = AUTO_PAN_SPEED;
          else if (e.x > screenWidth - EDGE_MARGIN) panX = -AUTO_PAN_SPEED;
          if (e.y < EDGE_MARGIN) panY = AUTO_PAN_SPEED;
          else if (e.y > screenHeight - EDGE_MARGIN - 50) panY = -AUTO_PAN_SPEED;
          autoPanDir.value = { x: panX, y: panY };
          isAutoPanning.value = panX !== 0 || panY !== 0;

          const dx = (e.translationX - autoPanAccum.value.x) / scale.value;
          const dy = (e.translationY - autoPanAccum.value.y) / scale.value;

          nodesStore.modify((val: any) => {
            'worklet';
            selectedNodeIds.value.forEach(id => {
              const startPos = startDragOffset.value[id];
              if (val[id] && startPos) {
                val[id].x.value = startPos.x + dx;
                val[id].y.value = startPos.y + dy;
              }
            });
            if (selectionDragging.value && startSelectionRect.value) {
              const s = startSelectionRect.value;
              selectionRect.value = { x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy, active: true };
            }
            return val;
          });
        }
      })
      .onFinalize((e) => {
        const adjX = (e.x - translateX.value) / scale.value;
        const adjY = (e.y - translateY.value) / scale.value;

        if (selectionRect.value.active && !selectionDragging.value) {
          const selX1 = Math.min(selectionRect.value.x1, selectionRect.value.x2);
          const selY1 = Math.min(selectionRect.value.y1, selectionRect.value.y2);
          const selX2 = Math.max(selectionRect.value.x1, selectionRect.value.x2);
          const selY2 = Math.max(selectionRect.value.y1, selectionRect.value.y2);
          const newSelectedIds: string[] = [];
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          const store = nodesStore.value || {};
          const order: string[] = store.__order || [];
          for (let i = 0; i < order.length; i++) {
            const id = order[i];
            const n = store[id];
            if (!n) continue;
            if (n.x.value + n.width >= selX1 && n.x.value <= selX2 && n.y.value + n.height >= selY1 && n.y.value <= selY2) {
              newSelectedIds.push(id);
              minX = Math.min(minX, n.x.value);
              minY = Math.min(minY, n.y.value);
              maxX = Math.max(maxX, n.x.value + n.width);
              maxY = Math.max(maxY, n.y.value + n.height);
            }
          }
          if (newSelectedIds.length > 0) {
            selectedNodeIds.value = newSelectedIds;
            const offset = 15;
            selectionRect.value = { x1: minX - offset, y1: minY - offset, x2: maxX + offset, y2: maxY + offset, active: true };
          } else {
            selectionRect.value = { x1: 0, y1: 0, x2: 0, y2: 0, active: false };
            selectedNodeIds.value = [];
          }
        }

        const hasMoved = Math.abs(e.translationX) > 5 || Math.abs(e.translationY) > 5;
        if (isConnecting.value && hasMoved && activeNodeId.value) {
          let targetId: string | null = null;
          const store = nodesStore.value || {};
          const vis = visibleNodeIdsSV.value || [];
          for (let vi = 0; vi < vis.length; vi++) {
            const id = vis[vi];
            const n = store[id];
            if (!n) continue;
            if (adjX >= n.x.value - PORT_RADIUS && adjX <= n.x.value + n.width + PORT_RADIUS && adjY >= n.y.value - PORT_RADIUS && adjY <= n.y.value + n.height + PORT_RADIUS) {
              const parts = [n.inputPorts || [], n.additionalPorts || []];
              for (let part = 0; part < parts.length; part++) {
                const ports = parts[part];
                for (let pi = 0; pi < ports.length; pi++) {
                  const port = ports[pi];
                  const portX = n.x.value + port.x;
                  const portY = n.y.value + port.y;
                  const hitbox = adjX > (portX - PORT_RADIUS) && adjX < (portX + PORT_RADIUS) && adjY > (portY - PORT_RADIUS - EPSILON_PORT_HITBOX) && adjY < (portY + PORT_RADIUS + EPSILON_PORT_HITBOX);
                  if (hitbox) {
                    targetPort.value = pi;
                    additionalPort.value = part;
                    targetId = id;
                    break;
                  }
                }
                if (targetId) break;
              }
              if (targetId) break;
            }
          }
          if (targetId) runOnJS(mergeGraphs)(activeNodeId.value, targetId, sourcePort.value ?? undefined, targetPort.value ?? undefined, additionalPort.value ?? undefined);
        }

        const currentId = activeNodeId.value;
        if (currentId) {
          nodesStore.modify((val: any) => { 'worklet'; if (val[currentId]) val[currentId].isActive = 0; return val; });
        }

        selectionDragging.value = false;
        startSelectionRect.value = null;
        autoPanDir.value = { x: 0, y: 0 };
        isAutoPanning.value = false;
        autoPanAccum.value = { x: 0, y: 0 };

        activeNodeId.value = null;
        isConnecting.value = false;
        tempLine.value = { x1: 0, y1: 0, x2: 0, y2: 0 };
        runOnJS(setActiveNodeIdJS)(null);
      });

    const tap = Gesture.Tap().onStart((e) => {
      nodesStore.modify((val: any) => {
        'worklet';
        if (!val) return val;
        const order = val.__order || [];
        for (let i = 0; i < order.length; i++) {
          const id = order[i];
          if (val[id]) val[id].isActive = 0;
        }
        return val;
      });

      const adjX = (e.x - translateX.value) / scale.value;
      const adjY = (e.y - translateY.value) / scale.value;
      const rect = selectionRect.value || { x1: 0, y1: 0, x2: 0, y2: 0 };
      const minX = Math.min(rect.x1, rect.x2);
      const maxX = Math.max(rect.x1, rect.x2);
      const minY = Math.min(rect.y1, rect.y2);
      const maxY = Math.max(rect.y1, rect.y2);
      const isOutside = adjX < minX || adjX > maxX || adjY < minY || adjY > maxY;
      if (isOutside) {
        selectionRect.value = { x1: 0, y1: 0, x2: 0, y2: 0, active: false };
        selectedNodeIds.value = [];
      }

      let found: any = null;
      const store = nodesStore.value || {};
      const vis = visibleNodeIdsSV.value || [];
      for (let i = 0; i < vis.length; i++) {
        const id = vis[i];
        const n = store[id];
        if (adjX >= n.x.value && adjX <= n.x.value + n.width && adjY >= n.y.value && adjY <= n.y.value + n.height) {
          store[n.nodeId].isActive = 1;
          found = { nodeId: n.nodeId, x: n.x.value * scale.value + translateX.value, y: n.y.value * scale.value + translateY.value, width: n.width * scale.value, height: n.height * scale.value, scale: scale.value };
          break;
        }
      }
      runOnJS(setActiveMenu)(found);
    });

    return Gesture.Race(pan, tap);
  }, [nodesStore, screenWidth, screenHeight, visibleNodeIdsSV, linksSV, mergeGraphs, handleDisconnect]);

  const canvasGesture = useMemo(() => {
    const canvasPan = Gesture.Pan()
      .minPointers(2)
      .onStart(() => {
        runOnJS(setActiveMenu)(null);
        if (isPinching.value || activeNodeId.value !== null) return;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((e) => {
        if (isPinching.value || activeNodeId.value !== null) return;
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      });

    const canvasPinch = Gesture.Pinch()
      .onStart((e) => {
        isPinching.value = true;
        savedScale.value = scale.value;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        pinchCenter.value = { x: (e.focalX - translateX.value) / scale.value, y: (e.focalY - translateY.value) / scale.value };
      })
      .onUpdate((e) => {
        let nextScale = savedScale.value * e.scale;
        if (nextScale < MIN_SCALE) nextScale = MIN_SCALE;
        if (nextScale > MAX_SCALE) nextScale = MAX_SCALE;
        const scaleChange = nextScale - savedScale.value;
        translateX.value = savedTranslateX.value - pinchCenter.value.x * scaleChange;
        translateY.value = savedTranslateY.value - pinchCenter.value.y * scaleChange;
        scale.value = nextScale;
      })
      .onEnd(() => { isPinching.value = false; });

    return Gesture.Simultaneous(canvasPan, canvasPinch);
  }, [activeNodeId, isPinching]);

  const handleMenuAction = useCallback((action: string) => {
    if (action === 'delete' && activeMenu) deleteNode(activeMenu.nodeId);
    runOnJS(setActiveMenu)(null);
  }, [activeMenu, deleteNode]);

  const sceneTransform = useDerivedValue(() => [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }]);

  const font = useFont(require('../../../assets/fonts/Roboto_Condensed-BlackItalic.ttf'), FONT_SIZE);
  const iconFont = useFont(require('../../../assets/fonts/MaterialCommunityIcons.ttf'), ICON_FONT_SIZE);

  const composedGesture = useMemo(() => Gesture.Simultaneous(nodeGestures, canvasGesture), [nodeGestures, canvasGesture]);

  const vX = useDerivedValue(() => {
    const s = scale.value || 1;
    const w = ((screenWidth - RIGHT_MARGIN) / s) * MINIMAP_RATIO;
    const rawX = (-translateX.value / s) * MINIMAP_RATIO + (MINIMAP_SIZE / 2);
    return clamp(rawX, 0, MINIMAP_SIZE - w);
  });
  const vY = useDerivedValue(() => {
    const s = scale.value || 1;
    const h = (screenHeight / s) * MINIMAP_RATIO;
    const rawY = (-translateY.value / s) * MINIMAP_RATIO + (MINIMAP_SIZE / 2);
    return clamp(rawY, 0, MINIMAP_SIZE - h);
  });
  const vW = useDerivedValue(() => {
    const w = (screenWidth / (scale.value || 1)) * MINIMAP_RATIO;
    return Math.min(w, MINIMAP_SIZE);
  });
  const vH = useDerivedValue(() => {
    const h = (screenHeight / (scale.value || 1)) * MINIMAP_RATIO;
    return Math.min(h, MINIMAP_SIZE);
  });

  const updateMinimapRect = useCallback((rect: { x: number; y: number; w: number; h: number }) => {
    setMinimapRect(prev => {
      if (prev.x === rect.x && prev.y === rect.y && prev.w === rect.w && prev.h === rect.h) return prev;
      return rect;
    });
  }, []);

  useAnimatedReaction(
    () => ({ x: vX.value, y: vY.value, w: vW.value, h: vH.value }),
    (rect) => {
      runOnJS(updateMinimapRect)(rect);
    }
  );

  const minimapGesture = useMemo(() => Gesture.Pan().onUpdate((e) => {
    const clampedX = clamp(e.x, minimapRect.w / 2, MINIMAP_SIZE - minimapRect.w / 2);
    const clampedY = clamp(e.y, minimapRect.h / 2, MINIMAP_SIZE - minimapRect.h / 2);
    const targetWorldX = (clampedX / MINIMAP_RATIO) - (WORLD_SIZE / 2);
    const targetWorldY = (clampedY / MINIMAP_RATIO) - (WORLD_SIZE / 2);
    const nextX = -targetWorldX * scale.value + (screenWidth / 2);
    const nextY = -targetWorldY * scale.value + (screenHeight / 2);
    translateX.value = withSpring(nextX);
    translateY.value = withSpring(nextY);
  }), [minimapRect, scale, translateX, translateY, screenWidth, screenHeight, MINIMAP_RATIO]);

  const visibleNodesToRender = useMemo(() => {
    return {
      normal: visibleNodeIds.filter(id => id !== activeNodeIdJS),
      active: activeNodeIdJS ? [activeNodeIdJS] : [],
    };
  }, [visibleNodeIds, activeNodeIdJS]);

  const visibleLinksToRender = useMemo(() => {
    const linkMap = new Map(links.map(l => [l.id, l]));
    return visibleLinkIds.map(id => linkMap.get(id)!).filter(Boolean);
  }, [visibleLinkIds, links]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Animated.View style={[styles.sidebar, sidebarStyle]}>
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onAddNode={(type: string) => addNodeOfType(type)} />
          </Animated.View>

          <View style={styles.topBar}>
            <View style={styles.leftBar}>
              {!sidebarOpen && (
                <TouchableOpacity style={styles.menuBtn} onPress={() => setSidebarOpen(true)}>
                  <Menu color="cyan" size={16} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.rightBar}>
              <TouchableOpacity style={styles.menuBtn} onPress={runGraph}>
                <Play color="cyan" size={16} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={clearGraph}>
                <Eraser color="cyan" size={16} />
              </TouchableOpacity>
            </View>
          </View>

          <GestureDetector gesture={composedGesture}>
            <Canvas style={styles.canvas}>
              <Group transform={sceneTransform}>
                {visibleLinksToRender.map(l => (
                  <RenderLink key={l.id} fromId={l.from} toId={l.to} portFrom={l.portFrom} portTo={l.portTo} additionalPort={l.additionalPort} store={nodesStore} />
                ))}

                <RenderTempLine tempLine={tempLine} isConnecting={isConnecting} />

                {visibleNodesToRender.normal.map(id => (
                  <NodeRenderer key={id} id={id} store={nodesStore} font={font} iconFont={iconFont} />
                ))}

                {visibleNodesToRender.active.map(id => (
                  <NodeRenderer key={`active-${id}`} id={id} store={nodesStore} font={font} iconFont={iconFont} />
                ))}

                <SelectionRect selectionSV={selectionRect} />
              </Group>
            </Canvas>
          </GestureDetector>

          <GestureDetector gesture={minimapGesture}>
            <View style={styles.minimapContainer}>
              <Canvas style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}>
                <Group transform={[{ scale: MINIMAP_RATIO }, { translateX: WORLD_SIZE / 2 }, { translateY: WORLD_SIZE / 2 }]}>
                  {nodes.map(n => (<MinimapNode key={n.nodeId} id={n.nodeId} store={nodesStore} OFF={OFF} />))}
                </Group>
                {/* Render minimap selection rect from React state (safe in render) */}
                <SkiaRect x={minimapRect.x} y={minimapRect.y} width={minimapRect.w} height={minimapRect.h} color="green" style="stroke" strokeWidth={2} />
              </Canvas>
            </View>
          </GestureDetector>

          {activeMenu && (<NodeMenuOverlay visible x={activeMenu.x} y={activeMenu.y} width={activeMenu.width} scale={activeMenu.scale} onAction={handleMenuAction} />)}
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}
