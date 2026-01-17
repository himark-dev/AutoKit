export const DEFAULT_WORKFLOW_TEMPLATE = {
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