import React, { useMemo } from 'react';
import { Group, Rect, Circle, Paint, Text as SkiaText } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';

const ICONS: Record<string, string> = {
  'code': '\uF169',
  'filter': '\uF232',
  'merge': '\uF62D',
  'flashlight': '\uF244',
  'vibration': '\uF566',
  'webhook': '\uF62F',
  'schedule': '\uF150',
  'on_app_event': '\uF614',
  'ai_agent': '\uF004',
  'openai': '\uF487',
  'document_loader': '\uF21A',
};

export const PORT_RADIUS = 6;
const PORT_SPACING = 20;
const NODE_MIN_WIDTH = 80;
const NODE_MIN_HEIGHT = 80;
const OFF = -10000;

export interface LinkDataBackend {
  id: string;
  from: string;
  to: string;
  portFrom?: number;
  portTo?: number;
  additionalPort?: number
}

export interface NodeDataBackend {
  id: string;
  graphId: string;
  desc: string;
}

export interface NodeData {
  nodeId: string;
  graphId: string;
  desc: string;
  label: string;
  color: string;
  inputCount: number;
  outputCount: number;
  additionalCount: number;
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: number;
  height: number;
  inputPorts: { x: number; y: number }[];
  outputPorts: { x: number; y: number }[];
  additionalPorts: {x: number; y: number}[];
}

export const createNode = (data: any): NodeData => {
  const w = Math.max(Math.max(data.inputCount, data.outputCount) * PORT_SPACING, NODE_MIN_WIDTH);
  const h = Math.max(data.additionalCount * PORT_SPACING, NODE_MIN_HEIGHT)

  const inputPorts = Array.from({ length: data.inputCount }).map((_, i) => ({
    x: (w / (data.inputCount + 1)) * (i + 1),
    y: 0
  }));

  const outputPorts = Array.from({ length: data.outputCount }).map((_, i) => ({
    x: (w / (data.outputCount + 1)) * (i + 1),
    y: h
  }));

  const additionalPorts = Array.from({ length: data.additionalCount }).map((_, i) => ({
    x: 0,
    y: (h / (data.additionalCount + 1)) * (i + 1)
  }));

  return { ...data, width: w, height: h, inputPorts: inputPorts, outputPorts: outputPorts, additionalPorts: additionalPorts };
};

export const NodeView: React.FC<{ id: string; store: any; font: any, iconFont: any }> = ({ id, store, font, iconFont }) => {
  const nodeData: NodeData = store.value[id];
  if (!nodeData) return null;
  const { width: w, height: h, label, desc, inputPorts, outputPorts, additionalPorts, color } = nodeData;
  const transform = useDerivedValue(() => {
    const node = store.value[id];
    if (!node) return [{ translateX: OFF }, { translateY: OFF }];
    

    return [
      { translateX: node.x.value },
      { translateY: node.y.value },
    ];
  });

  const strokeColor = useDerivedValue(() =>
    store.value[id]?.isActive ? 'red' : 'transparent'
  );

  const iconName = ICONS[label];
  const iconMetrics = useMemo(() => {
    return iconFont ? iconFont.measureText(iconName) : { width: 0, height: 0, x: 0, y: 0 };
  }, [iconFont, iconName]);

  return (
    <Group transform={transform}>
      <Rect x={0} y={0} width={w} height={h} r={10} color={color}>
        <Paint style="stroke" strokeWidth={3} color={strokeColor} />
      </Rect>

      {iconFont && (
        <SkiaText 
          font={iconFont}
          x={w / 2 - (iconMetrics.x + iconMetrics.width / 2)} 
          y={h / 2 - (iconMetrics.y + iconMetrics.height / 2)} 
          text={iconName}
          color="white" 
        />
      )}

      {inputPorts.map((port, i) => (
        <Circle
          key={`in-${i}`}
          cx={port.x}
          cy={port.y}
          r={PORT_RADIUS}
          color="cyan"
        >
        </Circle>
      ))}

      {outputPorts.map((port, i) => (
        <Circle
          key={`out-${i}`}
          cx={port.x}
          cy={port.y}
          r={PORT_RADIUS}
          color="#555"
        >
          <Paint style="stroke" strokeWidth={2} color="cyan" />
        </Circle>
      ))}

      {additionalPorts.map((port, i) => (
        <Circle
          key={`out-${i}`}
          cx={port.x}
          cy={port.y}
          r={PORT_RADIUS}
          color="cyan"
        >
        </Circle>
      ))}

      {font && desc && (
              <SkiaText
                font={font}
                x={0}
                y={h+20}
                text={desc}
                color="white"
              />
            )}
    </Group>
  );
};