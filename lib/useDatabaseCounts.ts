import { useState, useEffect } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';

const { DatabaseModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(DatabaseModule);

export const useDatabaseCounts = () => {
  const [workflowCount, setWorkflowCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Подписываемся на изменения
    const subscription = eventEmitter.addListener('DatabaseCountUpdate', (data) => {
      if (data.type === 'workflowCount') {
        setWorkflowCount(data.count);
      } else if (data.type === 'runCount') {
        setHistoryCount(data.count);
      }
      setLoading(false);
    });

    // Запускаем подписки
    DatabaseModule.subscribeToWorkflowCount();
    DatabaseModule.subscribeToRunCount();

    return () => {
      subscription.remove();
      DatabaseModule.unsubscribeFromCounts();
    };
  }, []);

  return {
    workflowCount,
    historyCount,
    loading
  };
};