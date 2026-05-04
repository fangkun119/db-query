import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Space, Typography, Input, message, Spin, Empty, Tabs, Popover } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, DatabaseOutlined, TableOutlined, PlayCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import DatabaseList from './database-list';
import DatabaseForm from './database-form';
import SchemaTree from '../schema/schema-tree';
import { SqlEditor, NLInput } from '../editor';
import { ResultTable } from '../results/result-table';
import type { DatabaseSummary, DatabaseDetail, QueryResult } from '../../types';
import { listDbs, deleteDb, getDb, executeQuery, naturalQuery } from '../../services/api';
import { handleApiError } from '../../utils/errors';
import {
  EDITOR_MIN_HEIGHT,
  EDITOR_MAX_HEIGHT_OFFSET,
  EDITOR_DEFAULT_HEIGHT,
  RESIZER_HEIGHT,
  COLUMN_SPAN_AUTO,
  COLUMN_SPAN_FULL,
  COLORS,
} from '../../constants';

const { Title, Text } = Typography;

interface ColumnProps {
  span: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const Column: React.FC<ColumnProps> = ({ span, style, children }) => (
  <div
    style={{
      flex: span === COLUMN_SPAN_AUTO ? '0 0 auto' : span,
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
  const [activeTab, setActiveTab] = useState<'manual' | 'natural'>('manual');
  const [nlPrompt, setNlPrompt] = useState('');

  // Resizable state
  const [editorHeight, setEditorHeight] = useState(EDITOR_DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

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
    if (!selectedDatabase) return;

    if (activeTab === 'natural') {
      // Natural Language mode: generate SQL then execute
      if (!nlPrompt.trim()) {
        message.warning('Please enter a natural language question');
        return;
      }
      setExecutingQuery(true);
      try {
        // First generate SQL from natural language
        const nlResult = await naturalQuery(selectedDatabase.name, { prompt: nlPrompt });
        setSqlQuery(nlResult.sql);
        if (nlResult.explanation) {
          message.info(`Explanation: ${nlResult.explanation}`);
        }
        // Then execute the generated SQL
        const result = await executeQuery(selectedDatabase.name, { sql: nlResult.sql });
        setQueryResult(result);
        message.success(`Query executed successfully, ${result.totalCount} rows returned`);
      } catch (error: unknown) {
        message.error(handleApiError(error, 'Query execution failed'));
      } finally {
        setExecutingQuery(false);
      }
    } else {
      // Manual SQL mode: execute SQL directly
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
        message.error(handleApiError(error, 'Query execution failed'));
      } finally {
        setExecutingQuery(false);
      }
    }
  };

  const handleNaturalQuery = (prompt: string) => {
    setNlPrompt(prompt);
  };

  // Resizable handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = editorHeight;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeStartY.current;
    const newHeight = resizeStartHeight.current + deltaY;

    // Constrain height between min and max
    const minHeight = EDITOR_MIN_HEIGHT;
    const maxHeight = window.innerHeight - EDITOR_MAX_HEIGHT_OFFSET;
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    setEditorHeight(clampedHeight);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add/remove global event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
        <Column span={COLUMN_SPAN_AUTO} style={{ width: '260px', borderRight: '1px solid #f0f0f0', backgroundColor: COLORS.BACKGROUND_DARK }}>
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
              style={{ width: '100%', backgroundColor: COLORS.PRIMARY, color: '#FFFFFF', border: 'none', fontWeight: 600 }}
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
              <div style={{ height: '60px', padding: '0 16px', borderBottom: '1px solid #f0f0f0', backgroundColor: COLORS.PRIMARY, display: 'flex', alignItems: 'center' }}>
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
                    style={{ backgroundColor: '#FFFFFF', border: 'none', fontWeight: 700, color: COLORS.PRIMARY, height: '44px', padding: '0 20px', fontSize: '14px' }}
                  >
                    REFRESH
                  </Button>
                </Space>
              </div>
              <div style={{ height: '60px', padding: '0 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', backgroundColor: COLORS.BACKGROUND_LIGHT }}>
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
        <Column span={COLUMN_SPAN_FULL} style={{ backgroundColor: '#fff' }}>
          {selectedDatabase ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Query Editor Section with Tabs */}
              <div style={{ flex: '0 0 auto', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff', height: `${editorHeight}px`, overflow: 'hidden' }}>
                {/* Row 1: QUERY EDITOR Header */}
                <div style={{ height: '60px', padding: '0 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F5' }}>
                  <Title level={5} style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#262626' }}>
                    QUERY EDITOR
                  </Title>
                  <Button
                    icon={<PlayCircleOutlined style={{ fontSize: '16px' }} />}
                    onClick={handleExecuteQuery}
                    loading={executingQuery}
                    disabled={activeTab === 'manual' ? !sqlQuery.trim() : !nlPrompt.trim()}
                    style={{ backgroundColor: COLORS.PRIMARY, color: '#FFFFFF', border: 'none', fontWeight: 600, height: '44px', padding: '0 20px', fontSize: '14px' }}
                  >
                    Execute Query
                  </Button>
                </div>

                {/* Row 2: Tabs - 60px height, aligned with left column */}
                <div style={{ height: '60px', padding: '0 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', backgroundColor: COLORS.BACKGROUND_LIGHT }}>
                  <Tabs
                    activeKey={activeTab}
                    onChange={(key) => setActiveTab(key as 'manual' | 'natural')}
                    tabBarStyle={{ fontWeight: 600 }}
                    items={[
                      { key: 'manual', label: 'MANUAL SQL', children: null },
                      { key: 'natural', label: 'NATURAL LANGUAGE', children: null },
                    ]}
                  />
                </div>

                {/* Row 3: Editor Content - dynamic height */}
                <div style={{ height: `calc(${editorHeight}px - 120px)`, overflow: 'hidden' }}>
                  {activeTab === 'manual' ? (
                    <div style={{ height: '100%', overflow: 'hidden' }}>
                      <SqlEditor
                        value={sqlQuery}
                        onChange={setSqlQuery}
                        onExecute={handleExecuteQuery}
                      />
                    </div>
                  ) : (
                    <div style={{ height: '100%', overflow: 'hidden' }}>
                      <NLInput
                        onGenerate={handleNaturalQuery}
                        onExecute={handleExecuteQuery}
                        loading={executingQuery}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Resizable Divider */}
              <div
                onMouseDown={handleMouseDown}
                style={{
                  height: `${RESIZER_HEIGHT}px`,
                  backgroundColor: COLORS.BORDER,
                  cursor: 'row-resize',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  borderTop: '1px solid #e8e8e8',
                  borderBottom: '1px solid #e8e8e8',
                  transition: 'background-color 0.2s',
                  position: 'relative',
                  zIndex: 10,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d9d9d9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = COLORS.BORDER; }}
              >
                <div style={{ width: '40px', height: '2px', backgroundColor: '#b0b0b0', borderRadius: '1px' }} />
              </div>

              {/* Results Section */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#fff', minHeight: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, backgroundColor: COLORS.BACKGROUND_LIGHT }}>
                  <Space>
                    <Title level={5} style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                      RESULTS
                    </Title>
                    {queryResult && (
                      <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        - {queryResult.totalCount} ROWS - {queryResult.executionTimeMs}MS
                      </Text>
                    )}
                  </Space>
                  {sqlQuery && queryResult && (
                    <Popover
                      content={
                        <div style={{ maxWidth: 600 }}>
                          <pre style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            fontSize: '12px',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
                            backgroundColor: '#f5f5f5',
                            padding: '8px',
                            borderRadius: '4px'
                          }}>
                            {sqlQuery}
                          </pre>
                        </div>
                      }
                      trigger="hover"
                      placement="bottomRight"
                      overlayStyle={{ maxWidth: 600 }}
                    >
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        backgroundColor: COLORS.PRIMARY,
                        color: '#ffffff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontFamily: 'sans-serif'
                      }}>
                        SQL
                      </span>
                    </Popover>
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
