// Refactored graph rendering utilities with arrowheads on links
import React, { memo } from 'react';
import {
  Rect,
  Group,
  Path,
  Skia,
  DashPathEffect,
} from '@shopify/react-native-skia';
import { useDerivedValue, SharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import {MINIMAP_SIZE, LINK_COLOR, LINK_WIDTH, MARGIN } from '@/src/components/graph/constants';
import { NodeData } from '@/src/components/nodes/Node';
type NodeType = NodeData

interface RenderLinkProps {
  fromId: string;
  toId: string;
  portFrom?: number;
  portTo?: number;
  additionalPort?: number;
  store: any;
}

interface TempLineProps {
  tempLine: SharedValue<{ x1: number; y1: number; x2: number; y2: number }>;
  isConnecting: SharedValue<boolean>;
}

interface PortPositionProps {
  node: NodeType;
  port?: number;
  type: string;
}

interface MinimapNodeProps {
  id: string;
  store: SharedValue<Record<string, NodeData>>;
  OFF: number;
}

const getPortPosition = ({node, port, type} : PortPositionProps) => {
  'worklet';
  if (!node) return null;
  const p = type === 'additional'
    ? node.additionalPorts?.[port!]
    : node.inputPorts?.[port!];

  if (!p) return null;
  return {
    x: node.x.value + p.x,
    y: node.y.value + p.y,
  };
};

export const RenderLink: React.FC<RenderLinkProps> = ({ fromId, toId, portFrom, portTo, additionalPort, store }) => {
  const path = useDerivedValue(() => {
    const from = store.value[fromId];
    const to = store.value[toId];
    if (!from || !to) return Skia.Path.Make();

    const out = from.outputPorts?.[portFrom!];
    if (!out) return Skia.Path.Make();

    const start = {
      x: from.x.value + out.x,
      y: from.y.value + out.y,
    };

    const isAdditional = additionalPort === 1;
    const end = getPortPosition({node: to, port: portTo, type: isAdditional ? 'additional' : 'input' });
    if (!end) return Skia.Path.Make();

    const p = Skia.Path.Make();
    p.moveTo(start.x, start.y);

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // --- target above ---
    if (end.y < start.y + MARGIN) {
      const sideOffset = dx > MARGIN && !isAdditional
        ? start.x + dx / 2
        : Math.min(start.x, end.x) - (60 + MARGIN);

      p.lineTo(start.x, start.y + MARGIN);
      p.lineTo(sideOffset, start.y + MARGIN);

      if (isAdditional) {
        p.lineTo(sideOffset, end.y);
      } else {
        p.lineTo(sideOffset, end.y - MARGIN);
        p.lineTo(end.x, end.y - MARGIN);
      }
      p.lineTo(end.x, end.y);
    }
    // --- target below ---
    else {
      if (isAdditional) {
        p.cubicTo(
          start.x,
          start.y + dy * 0.5,
          end.x - MARGIN * 2,
          end.y,
          end.x,
          end.y
        );
      } else {
        const offset = Math.max(dy / 2, 20);
        p.cubicTo(
          start.x,
          start.y + offset,
          end.x,
          end.y - offset,
          end.x,
          end.y
        );
      }
    }

    return p;
  });
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={LINK_WIDTH}
      color={LINK_COLOR}
      strokeCap="round"
      strokeJoin="round"
    />
  );
};

// ================== TEMP LINK ==================
export const RenderTempLine: React.FC<TempLineProps> = ({ tempLine, isConnecting }) => {
  const path = useDerivedValue(() => {
    const { x1, y1, x2, y2 } = tempLine.value;
    const p = Skia.Path.Make();
    p.moveTo(x1, y1);

    const dy = y2 - y1;
    const offset = Math.max(Math.abs(dy) / 2, 30);
    const dx = x2 - x1;
    const minOffset = 50 + MARGIN;

    p.lineTo(x1, y1 + MARGIN);

    if (y2 < y1) {
      const side = Math.abs(dx) < minOffset
        ? x1 + (dx >= 0 ? minOffset : -minOffset)
        : x1 + dx / 2;

      p.lineTo(side, y1 + MARGIN);
      p.lineTo(side, y2 - MARGIN);
      p.lineTo(x2, y2 - MARGIN);
      p.lineTo(x2, y2);
    } else {
      p.cubicTo(x1, y1 + offset, x2, y2 - offset, x2, y2);
    }

    return p;
  });

  const opacity = useDerivedValue(() => (isConnecting.value ? 1 : 0));

  return (
    <Path
      path={path}
      color={LINK_COLOR}
      style="stroke"
      strokeWidth={2}
      opacity={opacity}
      strokeCap="round"
    >
      <DashPathEffect intervals={[10, 5]} />
    </Path>
  );
};

export const MinimapNode: React.FC<MinimapNodeProps> = ({ id, store, OFF }) => {
  const nodeData = store.value[id];
  if (!nodeData) return null;

  const transform = useDerivedValue(() => {
    const node = store.value[id];
    if (!node) return [{ translateX: OFF }, { translateY: OFF }];

    return [
      { translateX: node.x.value },
      { translateY: node.y.value },
    ];
  });

  return (
    <Group transform={transform}>
      <Rect
        x={0}
        y={0}
        width={nodeData.width}
        height={nodeData.height}
        color="black"
      />
    </Group>
  );
};

// ================== STYLES ==================
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  canvas: { flex: 1, backgroundColor: '#131314' },
  btn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  menu: { flexDirection: 'row', position: 'absolute', top: 10, right: 20, zIndex: 100 },
  menuBtn: { backgroundColor: '#444', padding: 10, marginLeft: 0, borderRadius: 8, borderWidth: 1, borderColor: 'cyan' },
  menuText: { color: 'cyan', fontWeight: 'bold', fontSize: 12 },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#222', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#444', width: 250 },
  modalTitle: { color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  mBtn: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10 },
  mBtnText: { color: 'white', fontWeight: 'bold' },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 240, zIndex: 20, },
  topBar: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 30, },
  leftBar: { flexDirection: 'row', },
  rightBar: { flexDirection: 'row', gap: 8, },
  minimapContainer: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    width: MINIMAP_SIZE,
    height: MINIMAP_SIZE,
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    overflow: 'hidden',
  },
});