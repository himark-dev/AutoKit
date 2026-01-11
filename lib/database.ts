import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Workflow {
  id: string;
  data: any; // JSON данные workflow
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  startTime: string;
  endTime: string;
  duration: number; // в секундах
  status: 'Running' | 'Succeeded' | 'Error';
  log: string[];
}

const WORKFLOWS_KEY = 'workflows';
const HISTORY_KEY = 'workflow_history';
const WORKFLOWS_KEY = 'workflows';

export class WorkflowDB {
  // Получить все workflows
  static async getAll(): Promise<Workflow[]> {
    try {
      const data = await AsyncStorage.getItem(WORKFLOWS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting workflows:', error);
      return [];
    }
  }

  // Получить workflow по ID
  static async getById(id: string): Promise<Workflow | null> {
    try {
      const workflows = await this.getAll();
      return workflows.find(w => w.id === id) || null;
    } catch (error) {
      console.error('Error getting workflow by id:', error);
      return null;
    }
  }

  // Добавить новый workflow
  static async add(data: any): Promise<string> {
    try {
      const workflows = await this.getAll();
      const id = Date.now().toString();
      const newWorkflow: Workflow = { id, data };
      workflows.push(newWorkflow);
      await AsyncStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
      return id;
    } catch (error) {
      console.error('Error adding workflow:', error);
      throw error;
    }
  }

  // Обновить workflow
  static async update(id: string, data: any): Promise<boolean> {
    try {
      const workflows = await this.getAll();
      const index = workflows.findIndex(w => w.id === id);
      if (index === -1) return false;
      workflows[index].data = data;
      await AsyncStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
      return true;
    } catch (error) {
      console.error('Error updating workflow:', error);
      return false;
    }
  }

  // Удалить workflow
  static async delete(id: string): Promise<boolean> {
    try {
      const workflows = await this.getAll();
      const filtered = workflows.filter(w => w.id !== id);
      await AsyncStorage.setItem(WORKFLOWS_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return false;
    }
  }

  // Очистить все данные
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WORKFLOWS_KEY);
    } catch (error) {
      console.error('Error clearing workflows:', error);
    }
  }

  // Принудительная инициализация (очистка + новые данные)
  static async forceInit(): Promise<void> {
    await this.clear();
    await this.initWithSampleData();
  }

  // Инициализация с тестовыми данными
  static async initWithSampleData(): Promise<void> {
    const existing = await this.getAll();
    if (existing.length > 0) return;

    const sampleWorkflows = [
      {
        title: "API Deploy",
        description: "Deploy API to staging environment",
        lastRun: "2 hours ago",
        nodeCount: 4,
        graph: {
          nodes: [
            { id: "1", type: "start", label: "Start", x: 100, y: 100 },
            { id: "2", type: "build", label: "Build API", x: 250, y: 100 },
            { id: "3", type: "test", label: "Run Tests", x: 400, y: 100 },
            { id: "4", type: "deploy", label: "Deploy", x: 550, y: 100 }
          ],
          links: [
            { source: "1", target: "2" },
            { source: "2", target: "3" },
            { source: "3", target: "4" }
          ],
          coords: {
            "1": { x: 100, y: 100 },
            "2": { x: 250, y: 100 },
            "3": { x: 400, y: 100 },
            "4": { x: 550, y: 100 }
          }
        }
      },
      {
        title: "Database Backup",
        description: "Automated database backup and sync",
        lastRun: "1 day ago",
        nodeCount: 5,
        graph: {
          nodes: [
            { id: "1", type: "start", label: "Start", x: 100, y: 150 },
            { id: "2", type: "backup", label: "Create Backup", x: 300, y: 150 },
            { id: "3", type: "verify", label: "Verify", x: 500, y: 150 },
            { id: "4", type: "sync", label: "Sync to Cloud", x: 300, y: 300 },
            { id: "5", type: "end", label: "Complete", x: 500, y: 300 }
          ],
          links: [
            { source: "1", target: "2" },
            { source: "2", target: "3" },
            { source: "2", target: "4" },
            { source: "4", target: "5" }
          ],
          coords: {
            "1": { x: 100, y: 150 },
            "2": { x: 300, y: 150 },
            "3": { x: 500, y: 150 },
            "4": { x: 300, y: 300 },
            "5": { x: 500, y: 300 }
          }
        }
      },
      {
        title: "Code Review",
        description: "Automated code quality checks",
        lastRun: "3 hours ago",
        nodeCount: 6,
        graph: {
          nodes: [
            { id: "1", type: "start", label: "Start", x: 100, y: 200 },
            { id: "2", type: "lint", label: "Lint Code", x: 250, y: 150 },
            { id: "3", type: "test", label: "Unit Tests", x: 250, y: 250 },
            { id: "4", type: "security", label: "Security Scan", x: 400, y: 200 },
            { id: "5", type: "review", label: "Code Review", x: 550, y: 200 },
            { id: "6", type: "end", label: "Approve", x: 700, y: 200 }
          ],
          links: [
            { source: "1", target: "2" },
            { source: "1", target: "3" },
            { source: "2", target: "4" },
            { source: "3", target: "4" },
            { source: "4", target: "5" },
            { source: "5", target: "6" }
          ],
          coords: {
            "1": { x: 100, y: 200 },
            "2": { x: 250, y: 150 },
            "3": { x: 250, y: 250 },
            "4": { x: 400, y: 200 },
            "5": { x: 550, y: 200 },
            "6": { x: 700, y: 200 }
          }
        }
      },
      {
        title: "Build & Test",
        description: "Run tests and build application",
        lastRun: "30 min ago",
        nodeCount: 8,
        graph: {
          nodes: [
            { id: "1", type: "start", label: "Start", x: 100, y: 250 },
            { id: "2", type: "install", label: "Install Deps", x: 250, y: 250 },
            { id: "3", type: "lint", label: "Lint", x: 400, y: 200 },
            { id: "4", type: "test", label: "Unit Tests", x: 400, y: 300 },
            { id: "5", type: "integration", label: "Integration Tests", x: 550, y: 250 },
            { id: "6", type: "build", label: "Build", x: 700, y: 250 },
            { id: "7", type: "package", label: "Package", x: 850, y: 250 },
            { id: "8", type: "end", label: "Complete", x: 1000, y: 250 }
          ],
          links: [
            { source: "1", target: "2" },
            { source: "2", target: "3" },
            { source: "2", target: "4" },
            { source: "3", target: "5" },
            { source: "4", target: "5" },
            { source: "5", target: "6" },
            { source: "6", target: "7" },
            { source: "7", target: "8" }
          ],
          coords: {
            "1": { x: 100, y: 250 },
            "2": { x: 250, y: 250 },
            "3": { x: 400, y: 200 },
            "4": { x: 400, y: 300 },
            "5": { x: 550, y: 250 },
            "6": { x: 700, y: 250 },
            "7": { x: 850, y: 250 },
            "8": { x: 1000, y: 250 }
          }
        }
      },
      {
        title: "Security Scan",
        description: "Vulnerability scanning workflow",
        lastRun: "1 week ago",
        nodeCount: 7,
        graph: {
          nodes: [
            { id: "1", type: "start", label: "Start", x: 100, y: 300 },
            { id: "2", type: "deps", label: "Scan Dependencies", x: 250, y: 250 },
            { id: "3", type: "code", label: "Code Analysis", x: 250, y: 350 },
            { id: "4", type: "secrets", label: "Secret Detection", x: 400, y: 300 },
            { id: "5", type: "report", label: "Generate Report", x: 550, y: 300 },
            { id: "6", type: "notify", label: "Send Alerts", x: 700, y: 250 },
            { id: "7", type: "end", label: "Complete", x: 700, y: 350 }
          ],
          links: [
            { source: "1", target: "2" },
            { source: "1", target: "3" },
            { source: "2", target: "4" },
            { source: "3", target: "4" },
            { source: "4", target: "5" },
            { source: "5", target: "6" },
            { source: "5", target: "7" }
          ],
          coords: {
            "1": { x: 100, y: 300 },
            "2": { x: 250, y: 250 },
            "3": { x: 250, y: 350 },
            "4": { x: 400, y: 300 },
            "5": { x: 550, y: 300 },
            "6": { x: 700, y: 250 },
            "7": { x: 700, y: 350 }
          }
        }
      }
    ];

    for (const workflow of sampleWorkflows) {
      await this.add(workflow);
    }
  }
}

export class HistoryDB {
  // Получить всю историю
  static async getAll(): Promise<WorkflowRun[]> {
    try {
      const data = await AsyncStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  // Получить запуск по ID
  static async getById(id: string): Promise<WorkflowRun | null> {
    try {
      const history = await this.getAll();
      return history.find(h => h.id === id) || null;
    } catch (error) {
      console.error('Error getting run by id:', error);
      return null;
    }
  }

  // Добавить новый запуск
  static async add(run: Omit<WorkflowRun, 'id'>): Promise<string> {
    try {
      const history = await this.getAll();
      const id = Date.now().toString();
      const newRun: WorkflowRun = { id, ...run };
      history.unshift(newRun); // Добавляем в начало (новые сверху)
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return id;
    } catch (error) {
      console.error('Error adding run:', error);
      throw error;
    }
  }

  // Очистить историю
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }

  // Инициализация с тестовыми данными
  static async initWithSampleData(): Promise<void> {
    const existing = await this.getAll();
    if (existing.length > 0) return;

    const sampleRuns: Omit<WorkflowRun, 'id'>[] = [
      {
        workflowId: "1",
        workflowName: "API Deploy",
        startTime: "2024-01-09T08:30:00Z",
        endTime: "2024-01-09T08:35:30Z",
        duration: 330,
        status: "Succeeded",
        log: [
          "[08:30:00] Starting API Deploy workflow",
          "[08:30:15] Building API...",
          "[08:32:45] Build completed successfully",
          "[08:33:00] Running tests...",
          "[08:34:30] All tests passed",
          "[08:35:00] Deploying to staging...",
          "[08:35:30] Deployment completed successfully"
        ]
      },
      {
        workflowId: "2",
        workflowName: "Database Backup",
        startTime: "2024-01-08T02:00:00Z",
        endTime: "2024-01-08T02:15:45Z",
        duration: 945,
        status: "Succeeded",
        log: [
          "[02:00:00] Starting Database Backup workflow",
          "[02:00:30] Creating database backup...",
          "[02:10:15] Backup created successfully (2.3GB)",
          "[02:10:30] Verifying backup integrity...",
          "[02:12:00] Backup verification passed",
          "[02:12:15] Syncing to cloud storage...",
          "[02:15:45] Sync completed successfully"
        ]
      },
      {
        workflowId: "1",
        workflowName: "API Deploy",
        startTime: "2024-01-07T14:20:00Z",
        endTime: "2024-01-07T14:22:15Z",
        duration: 135,
        status: "Error",
        log: [
          "[14:20:00] Starting API Deploy workflow",
          "[14:20:15] Building API...",
          "[14:21:30] Build completed successfully",
          "[14:21:45] Running tests...",
          "[14:22:00] ERROR: Test 'user-auth-test' failed",
          "[14:22:15] Workflow terminated due to test failures"
        ]
      },
      {
        workflowId: "2",
        workflowName: "Database Backup",
        startTime: "2024-01-06T02:00:00Z",
        endTime: "2024-01-06T02:08:30Z",
        duration: 510,
        status: "Error",
        log: [
          "[02:00:00] Starting Database Backup workflow",
          "[02:00:30] Creating database backup...",
          "[02:05:15] ERROR: Insufficient disk space",
          "[02:05:30] Attempting cleanup...",
          "[02:07:00] ERROR: Cleanup failed",
          "[02:08:30] Workflow terminated due to storage issues"
        ]
      }
    ];

    for (const run of sampleRuns) {
      await this.add(run);
    }
  }
}