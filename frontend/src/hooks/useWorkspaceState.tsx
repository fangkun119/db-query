import { useState, useCallback, useEffect } from 'react';
import { message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { DatabaseSummary, DatabaseDetail, QueryResult } from '../types';
import { listDbs, deleteDb, getDb, refreshDb, executeQuery, naturalQuery } from '../services/api';
import { handleApiError } from '../utils/errors';
import { SQL_MODAL_STYLES } from '../styles/common';

interface UseWorkspaceStateReturn {
  databases: DatabaseSummary[];
  selectedDatabase: DatabaseDetail | null;
  loadingDatabases: boolean;
  loadingDatabase: boolean;
  refreshing: boolean;
  queryResult: QueryResult | null;
  executingQuery: boolean;
  sqlQuery: string;
  activeTab: 'manual' | 'natural';
  nlPrompt: string;
  setSqlQuery: (query: string) => void;
  setActiveTab: (tab: 'manual' | 'natural') => void;
  setNlPrompt: (prompt: string) => void;
  setQueryResult: (result: QueryResult | null) => void;
  loadDatabases: () => Promise<void>;
  loadDatabase: (name: string) => Promise<void>;
  handleDatabaseClick: (name: string) => void;
  handleDatabaseDelete: (name: string) => Promise<void>;
  handleRefresh: () => Promise<void>;
  handleExecuteQuery: () => Promise<void>;
}

export function useWorkspaceState(): UseWorkspaceStateReturn {
  const [databases, setDatabases] = useState<DatabaseSummary[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseDetail | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingDatabase, setLoadingDatabase] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executingQuery, setExecutingQuery] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'natural'>('manual');
  const [nlPrompt, setNlPrompt] = useState('');

  const loadDatabases = useCallback(async () => {
    setLoadingDatabases(true);
    try {
      const data = await listDbs();
      setDatabases(data);
    } catch (error: unknown) {
      message.error(handleApiError(error, 'Failed to load database list'));
    } finally {
      setLoadingDatabases(false);
    }
  }, []);

  const loadDatabase = useCallback(async (name: string) => {
    setLoadingDatabase(true);
    try {
      const data = await getDb(name);
      setSelectedDatabase(data);
      setQueryResult(null);
      setSqlQuery('');
    } catch (error: unknown) {
      message.error(handleApiError(error, 'Failed to load database'));
    } finally {
      setLoadingDatabase(false);
    }
  }, []);

  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  const handleDatabaseClick = useCallback((name: string) => {
    loadDatabase(name);
  }, [loadDatabase]);

  const handleDatabaseDelete = useCallback(async (name: string) => {
    try {
      await deleteDb(name);
      message.success('Database connection deleted');
      if (selectedDatabase?.name === name) {
        setSelectedDatabase(null);
        setQueryResult(null);
        setSqlQuery('');
      }
      loadDatabases();
    } catch (error: unknown) {
      message.error(handleApiError(error, 'Failed to delete'));
    }
  }, [selectedDatabase, loadDatabases]);

  const handleRefresh = useCallback(async () => {
    if (!selectedDatabase) return;

    setRefreshing(true);
    try {
      const data = await refreshDb(selectedDatabase.name);
      setSelectedDatabase(data);
      message.success('Metadata refreshed');
    } catch (error: unknown) {
      message.error(handleApiError(error, 'Failed to refresh'));
    } finally {
      setRefreshing(false);
    }
  }, [selectedDatabase]);

  const showErrorModal = useCallback((title: string, message: string, sql?: string) => {
    Modal.error({
      title,
      icon: <ExclamationCircleOutlined />,
      width: 700,
      content: (
        <div>
          <p>{message}</p>
          {sql && (
            <>
              <p style={{ fontWeight: 600, marginTop: 16 }}>SQL:</p>
              <pre style={SQL_MODAL_STYLES}>{sql}</pre>
            </>
          )}
        </div>
      ),
    });
  }, []);

  const handleExecuteQuery = useCallback(async () => {
    if (!selectedDatabase) return;

    if (activeTab === 'natural') {
      if (!nlPrompt.trim()) {
        message.warning('Please enter a natural language question');
        return;
      }
      setExecutingQuery(true);
      try {
        const nlResult = await naturalQuery(selectedDatabase.name, { prompt: nlPrompt });
        setSqlQuery(nlResult.sql);
        if (nlResult.explanation) {
          message.info(`Explanation: ${nlResult.explanation}`);
        }
        const result = await executeQuery(selectedDatabase.name, { sql: nlResult.sql });
        setQueryResult(result);
        message.success(`Query executed successfully, ${result.totalCount} rows returned`);
      } catch (error: unknown) {
        const errorMsg = handleApiError(error, 'Query execution failed');
        if (errorMsg.includes('Generated SQL:')) {
          const parts = errorMsg.split('Generated SQL:');
          showErrorModal('SQL Generation Failed', parts[0], parts[1]);
        } else {
          showErrorModal('Query Execution Failed', errorMsg, sqlQuery);
        }
      } finally {
        setExecutingQuery(false);
      }
    } else {
      if (!sqlQuery.trim()) {
        message.warning('Please enter a SQL query');
        return;
      }
      setExecutingQuery(true);
      try {
        const result = await executeQuery(selectedDatabase.name, { sql: sqlQuery });
        setQueryResult(result);
        message.success(`Query executed successfully, ${result.totalCount} rows returned`);
      } catch (error: unknown) {
        const errorMsg = handleApiError(error, 'Query execution failed');
        showErrorModal('Query Execution Failed', errorMsg, sqlQuery);
      } finally {
        setExecutingQuery(false);
      }
    }
  }, [selectedDatabase, activeTab, nlPrompt, sqlQuery, showErrorModal]);

  return {
    databases,
    selectedDatabase,
    loadingDatabases,
    loadingDatabase,
    refreshing,
    queryResult,
    executingQuery,
    sqlQuery,
    activeTab,
    nlPrompt,
    setSqlQuery,
    setActiveTab,
    setNlPrompt,
    setQueryResult,
    loadDatabases,
    loadDatabase,
    handleDatabaseClick,
    handleDatabaseDelete,
    handleRefresh,
    handleExecuteQuery,
  };
}
