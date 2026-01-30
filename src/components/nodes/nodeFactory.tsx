import { createNode, NodeData, NodeView } from '@/src/components/nodes/Node'
import { SharedValue } from 'react-native-reanimated';


export type NodeDefinitionType = 'Code' | 'Filter' | 'Merge' | 'FlashLight' | 'Vibration' | 'Webhook' | 'Schedule' | 'On App Event' | 'AI Agent' | 'OpenAI' | 'Document Loader';

interface NodeDefinition {
  label: string;
  color: string;
  inputCount: number;
  outputCount: number;
  additionalCount: number;
}

const NODE_DEFINITIONS: Record<NodeDefinitionType, NodeDefinition> = {
    'Code': {label: 'code', color: '#333', inputCount: 1, outputCount: 1, additionalCount: 0},
    'Filter': {label: 'filter', color: '#333', inputCount: 1, outputCount: 1, additionalCount: 0},
    'Merge': {label: 'merge', color: '#333', inputCount: 2, outputCount: 1, additionalCount: 0},
    'FlashLight': {label: 'flashlight', color: '#333', inputCount: 1, outputCount: 1, additionalCount: 0},
    'Vibration': {label: 'vibration', color: '#333', inputCount: 1, outputCount: 1, additionalCount: 0},
    'Webhook': {label: 'webhook', color: '#333', inputCount: 0, outputCount: 1, additionalCount: 0},
    'Schedule': {label: 'schedule', color: '#333', inputCount: 0, outputCount: 1, additionalCount: 0},
    'On App Event': {label: 'on_app_event', color: '#333', inputCount: 0, outputCount: 1, additionalCount: 0},
    'AI Agent': {label: 'ai_agent', color: '#333', inputCount: 1, outputCount: 1, additionalCount: 3},
    'OpenAI': {label: 'openAI', color: '#333', inputCount: 1, outputCount: 1, additionalCount: 1},
    'Document Loader': {label: 'document_loader', color: '#333', inputCount: 0, outputCount: 1, additionalCount: 0},
};

export const nodeFactory = (
    type: NodeDefinitionType,
    nodeId: string,
    graphId: string,
    x: SharedValue<number>,
    y: SharedValue<number>
  ): NodeData => {
    const def = NODE_DEFINITIONS[type];

    return createNode({
      nodeId,
      graphId,
      desc: type,
      label: def.label.trim().toLowerCase().replace(/\s+/g, '_'),
      color: def.color,
      inputCount: def.inputCount,
      outputCount: def.outputCount,
      additionalCount: def.additionalCount,
      x,
      y,
    });
  };

  export const NodeRenderer: React.FC<{ id: string; store: any, font: any, iconFont: any }> = (props) => {
    return <NodeView {...props} />;
  };