import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, Typography, Input, message, Spin, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, DatabaseOutlined, TableOutlined, PlayCircleOutlined } from '@ant-design/icons';
import DatabaseList from './database-list';
import DatabaseForm from './database-form';
import SchemaTree from '../schema/schema-tree';
import { SqlEditor } from '../editor';
import { ResultTable } from '../results/result-table';
import type { DatabaseSummary, DatabaseDetail, QueryResult } from '../../types';
import { listDbs, deleteDb, getDb, executeQuery } from '../../services/api';
import { handleApiError } from '../../utils/errors';

const { Title, Text } = Typography;

interface ColumnProps {
  span: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const Column: React.FC<ColumnProps> = ({ span, style, children }) => (
  <div
    style={{
      flex: span === 0 ? '0 0 auto' : span,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    {children}
  </div>
);

export const DatabaseWorkspace: React.FC = () => {
  const [databases, setDatabases] = useState<DatabaseSummary[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseDetail | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingDatabase, setLoadingDatabase] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executingQuery, setExecutingQuery] = useState(false);

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDatabaseClick = (name: string) => {
    loadDatabase(name);
  };

  const handleDatabaseDelete = async (name: string) => {
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
  };

  const handleAddSuccess = () => {
    loadDatabases();
  };

  const handleRefresh = async () => {
    if (!selectedDatabase) return;

    setRefreshing(true);
    try {
      const data = await getDb(selectedDatabase.name);
      setSelectedDatabase(data);
      message.success('Metadata refreshed');
    } catch (error: unknown) {
      message.error(handleApiError(error, 'Failed to refresh'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleExecuteQuery = async () => {
    if (!selectedDatabase || !sqlQuery.trim()) return;

    setExecutingQuery(true);
    try {
      const result = await executeQuery(selectedDatabase.name, { sql: sqlQuery });
      setQueryResult(result);
      message.success(`Query executed successfully, ${result.totalCount} rows returned`);
    } catch (error: unknown) {
      message.error(handleApiError(error, 'Query execution failed'));
    } finally {
      setExecutingQuery(false);
    }
  };

  const filteredTables = selectedDatabase
    ? selectedDatabase.tables.filter(
        (table) =>
          table.tableName.toLowerCase().includes(searchValue.toLowerCase()) ||
          table.schemaName.toLowerCase().includes(searchValue.toLowerCase()) ||
          table.columns.some((col) => col.name.toLowerCase().includes(searchValue.toLowerCase()))
      )
    : [];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Main Workspace - Three Columns */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Column - DB List */}
        <Column span={0} style={{ width: '260px', borderRight: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
          <div style={{ height: '60px', padding: '0 16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#F5F5F5', display: 'flex', alignItems: 'center' }}>
            <DatabaseOutlined style={{ fontSize: '18px', color: '#595959', marginRight: '8px' }} />
            <Title level={5} style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#262626' }}>
              DB QUERY TOOL
            </Title>
          </div>
          <div style={{ height: '60px', padding: '0 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setFormOpen(true)}
              style={{ width: '100%', backgroundColor: '#B8860B', color: '#FFFFFF', border: 'none', fontWeight: 600 }}
            >
              ADD DATABASE
            </Button>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loadingDatabases ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Spin tip="Loading databases..." />
              </div>
            ) : databases.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No databases"
                style={{ marginTop: '40px' }}
              />
            ) : (
              <DatabaseList
                databases={databases}
                selectedName={selectedDatabase?.name}
                onDelete={handleDatabaseDelete}
                onClick={handleDatabaseClick}
              />
            )}
          </div>
        </Column>

        {/* Middle Column - Schema Browser */}
        <Column span={0} style={{ width: '380px', borderRight: '1px solid #f0f0f0' }}>
          {selectedDatabase ? (
            <>
              <div style={{ height: '60px', padding: '0 16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#B8860B', display: 'flex', alignItems: 'center' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space style={{ alignItems: 'center' }}>
                    <TableOutlined style={{ fontSize: '18px', color: '#FFFFFF' }} />
                    <Title level={5} style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }} ellipsis>
                      {selectedDatabase.name}
                    </Title>
                  </Space>
                  <Button
                    icon={<ReloadOutlined spin={refreshing} style={{ color: '#B8860B', fontSize: '16px' }} />}
                    onClick={handleRefresh}
                    loading={refreshing}
                    style={{ backgroundColor: '#FFFFFF', border: 'none', fontWeight: 700, color: '#B8860B', height: '44px', padding: '0 20px', fontSize: '14px' }}
                  >
                    REFRESH
                  </Button>
                </Space>
              </div>
              <div style={{ height: '60px', padding: '0 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', backgroundColor: '#F8F8F8' }}>
                <Input
                  className="schema-search-input"
                  prefix={<SearchOutlined />}
                  placeholder="Search tables, columns..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  allowClear
                />
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                {loadingDatabase ? (
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <Spin tip="Loading Schema..." />
                  </div>
                ) : (
                  <SchemaTree tables={filteredTables} loading={refreshing} />
                )}
              </div>
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
              <div>
                <DatabaseOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <div>
                  <Text type="secondary">Select a database from the left</Text>
                </div>
              </div>
            </div>
          )}
        </Column>

        {/* Right Column - Query Editor & Results */}
        <Column span={1} style={{ backgroundColor: '#fff' }}>
          {selectedDatabase ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Query Editor Section */}
              <div style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff' }}>
                <div style={{ height: '60px', padding: '0 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Title level={5} style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#262626' }}>
                    QUERY EDITOR
                  </Title>
                  <Button
                    icon={<PlayCircleOutlined style={{ fontSize: '16px' }} />}
                    onClick={handleExecuteQuery}
                    loading={executingQuery}
                    disabled={!sqlQuery.trim()}
                    style={{ backgroundColor: '#B8860B', color: '#FFFFFF', border: 'none', fontWeight: 600, height: '44px', padding: '0 20px', fontSize: '14px' }}
                  >
                    Execute Query
                  </Button>
                </div>
                <div style={{ padding: '16px', height: '300px' }}>
                  <SqlEditor
                    value={sqlQuery}
                    onChange={setSqlQuery}
                    placeholder="Enter SQL query... e.g., SELECT * FROM users LIMIT 10"
                  />
                </div>
              </div>

              {/* Results Section */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#fff' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <Title level={5} style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                    RESULTS
                  </Title>
                  {queryResult && (
                    <Text style={{ fontSize: '12px', color: '#8c8c8c', marginLeft: '12px' }}>
                      - {queryResult.totalCount} ROWS - {queryResult.executionTimeMs}MS
                    </Text>
                  )}
                </div>
                <div style={{ padding: '16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <ResultTable result={queryResult} loading={executingQuery} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Select a database to start querying"
              />
            </div>
          )}
        </Column>
      </div>

      {/* Add Database Modal */}
      <DatabaseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};

export default DatabaseWorkspace;
