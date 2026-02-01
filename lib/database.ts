// lib/database.ts
import { NativeModules } from 'react-native';

const { DatabaseModule } = NativeModules;

// Интерфейсы для вашей базы данных
export interface Workflow {
  id: string;
  name: string;
  json: string;
  status: 'ENABLED' | 'DISABLED';
  data?: any; // распарсенный json
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  start: number; // timestamp
  end: number; // timestamp (0 если нет)
  status: 'RUNNING' | 'SUCCESS' | 'ERROR';
  log: string;
  workflowName?: string; // будет подгружаться отдельно
}

// Вспомогательная функция для безопасного парсинга JSON
const safeJsonParse = (jsonString: string): any => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return {
      title: 'Invalid JSON',
      description: 'Failed to parse workflow data',
      lastRun: 'Never',
      nodeCount: 0,
      graph: { nodes: [], links: [], coords: {} }
    };
  }
};

// Рабочие методы для Workflows
export const WorkflowDB = {
  async forceInit() {
    // Для нативной БД это не нужно
    return Promise.resolve();
  },

  async getAll(): Promise<Workflow[]> {
    try {
      const result = await DatabaseModule.getAllWorkflows();
      if (!Array.isArray(result)) {
        console.warn('Expected array from getAllWorkflows, got:', typeof result);
        return [];
      }
      
      return result.map((item: any) => ({
        id: item.id || '',
        name: item.name || 'Unnamed Workflow',
        json: item.json || '{}',
        status: (item.status || 'ENABLED') as 'ENABLED' | 'DISABLED',
        data: safeJsonParse(item.json || '{}')
      }));
    } catch (error) {
      console.error('Error getting workflows:', error);
      return [];
    }
  },

  async getById(id: string): Promise<Workflow | null> {
    try {
      const result = await DatabaseModule.getWorkflowById(id);
      if (!result) return null;
      
      return {
        id: result.id || id,
        name: result.name || 'Unnamed Workflow',
        json: result.json || '{}',
        status: (result.status || 'ENABLED') as 'ENABLED' | 'DISABLED',
        data: safeJsonParse(result.json || '{}')
      };
    } catch (error) {
      console.error('Error getting workflow:', error);
      return null;
    }
  },

  async add(data: any): Promise<string> {
    try {
      const workflowData = typeof data === 'string' ? safeJsonParse(data) : data;
      const id = await DatabaseModule.upsertWorkflow(
        '', // новая запись
        workflowData.title || workflowData.name || 'New Workflow',
        JSON.stringify(workflowData),
        'ENABLED'
      );
      return id;
    } catch (error) {
      console.error('Error adding workflow:', error);
      throw error;
    }
  },

  async update(id: string, data: any): Promise<void> {
    try {
      const workflowData = typeof data === 'string' ? safeJsonParse(data) : data;
      await DatabaseModule.upsertWorkflow(
        id,
        workflowData.title || workflowData.name || 'Workflow',
        JSON.stringify(workflowData),
        'ENABLED'
      );
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await DatabaseModule.deleteWorkflow(id);
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  },

  async getCount(): Promise<number> {
    try {
      return await DatabaseModule.getWorkflowCount();
    } catch (error) {
      console.error('Error getting workflow count:', error);
      return 0;
    }
  }
};

// Рабочие методы для Runs (History)
export const HistoryDB = {
  async forceInit() {
    // Для нативной БД это не нужно
    return Promise.resolve();
  },

  async getAll(): Promise<WorkflowRun[]> {
    try {
      const result = await DatabaseModule.getAllRuns();
      if (!Array.isArray(result)) {
        console.warn('Expected array from getAllRuns, got:', typeof result);
        return [];
      }

      const runs: WorkflowRun[] = result.map((item: any) => ({
        id: item.id || '',
        workflowId: item.workflow || '', // исправлено: было workflowId, должно быть workflow
        start: item.start || Date.now(),
        end: item.end || 0,
        status: (item.status || 'RUNNING') as 'RUNNING' | 'SUCCESS' | 'ERROR',
        log: item.log || 'No log available'
      }));

      // Получаем имена workflow для каждого run
      const runsWithNames = await Promise.all(
        runs.map(async (run) => {
          try {
            if (!run.workflowId) {
              return { ...run, workflowName: 'Unknown Workflow' };
            }
            
            const workflow = await WorkflowDB.getById(run.workflowId);
            return {
              ...run,
              workflowName: workflow?.name || 'Unknown Workflow'
            };
          } catch (error) {
            console.error('Error getting workflow name for run:', run.id, error);
            return {
              ...run,
              workflowName: 'Unknown Workflow'
            };
          }
        })
      );

      return runsWithNames;
    } catch (error) {
      console.error('Error getting runs:', error);
      return [];
    }
  },

  async add(workflowId: string, status: 'RUNNING' | 'SUCCESS' | 'ERROR', log: string): Promise<string> {
    try {
      const startTime = Date.now();
      const id = await DatabaseModule.upsertRun(
        '', // новая запись
        workflowId,
        status,
        log,
        startTime,
        0 // endTime (0 = null)
      );
      return id;
    } catch (error) {
      console.error('Error adding run:', error);
      throw error;
    }
  },

  async updateRunStatus(runId: string, status: 'SUCCESS' | 'ERROR', log: string): Promise<void> {
    try {
      // Сначала получаем существующий run
      const existingRun = await this.getById(runId);
      if (!existingRun) {
        throw new Error('Run not found');
      }

      const endTime = Date.now();
      await DatabaseModule.upsertRun(
        runId,
        existingRun.workflowId,
        status,
        log,
        existingRun.start,
        endTime
      );
    } catch (error) {
      console.error('Error updating run:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<WorkflowRun | null> {
    try {
      const result = await DatabaseModule.getRunById(id);
      if (!result) return null;

      const run: WorkflowRun = {
        id: result.id || id,
        workflowId: result.workflow || '', // исправлено: было workflowId, должно быть workflow
        start: result.start || Date.now(),
        end: result.end || 0,
        status: (result.status || 'RUNNING') as 'RUNNING' | 'SUCCESS' | 'ERROR',
        log: result.log || 'No log available'
      };

      // Получаем имя workflow
      if (run.workflowId) {
        try {
          const workflow = await WorkflowDB.getById(run.workflowId);
          if (workflow) {
            run.workflowName = workflow.name;
          }
        } catch (error) {
          console.error('Error getting workflow for run:', error);
        }
      }

      return run;
    } catch (error) {
      console.error('Error getting run:', error);
      return null;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await DatabaseModule.deleteRun(id);
    } catch (error) {
      console.error('Error deleting run:', error);
      throw error;
    }
  },

  async deleteByWorkflowId(workflowId: string): Promise<void> {
    try {
      // Получаем все runs для этого workflow и удаляем по одному
      const allRuns = await this.getAll();
      const runsToDelete = allRuns.filter(run => run.workflowId === workflowId);
      
      for (const run of runsToDelete) {
        await this.delete(run.id);
      }
    } catch (error) {
      console.error('Error deleting runs by workflow id:', error);
      throw error;
    }
  },

  async clearAll(): Promise<void> {
    try {
      const allRuns = await this.getAll();
      for (const run of allRuns) {
        try {
          await this.delete(run.id);
        } catch (error) {
          console.error('Error deleting run:', run.id, error);
        }
      }
    } catch (error) {
      console.error('Error clearing all runs:', error);
      throw error;
    }
  },

  async getCount(): Promise<number> {
    try {
      return await DatabaseModule.getRunCount();
    } catch (error) {
      console.error('Error getting run count:', error);
      return 0;
    }
  },

  async getRunsByWorkflowId(workflowId: string): Promise<WorkflowRun[]> {
    try {
      const allRuns = await this.getAll();
      return allRuns.filter(run => run.workflowId === workflowId);
    } catch (error) {
      console.error('Error getting runs by workflow id:', error);
      return [];
    }
  }
};

// Экспортируем типы для использования в других файлах
export type { Workflow, WorkflowRun };

// Утилиты для форматирования
export const DatabaseUtils = {
  formatTimestamp(timestamp: number): string {
    if (!timestamp || timestamp <= 0) return 'Never';
    
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  formatDuration(start: number, end: number): string {
    if (!end || end <= 0) return 'Running...';
    
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  },

  truncateText(text: string, maxLength: number = 50): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
};

// Дефолтный экспорт для удобства
export default {
  WorkflowDB,
  HistoryDB,
  DatabaseUtils
};