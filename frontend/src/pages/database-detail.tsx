import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, Button, Space, Typography, Tag, Skeleton, message, Row, Col } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import SchemaTree from '../components/schema/schema-tree';
import { SqlEditor } from '../components/editor';
import { ResultTable } from '../components/results';
import type { DatabaseDetail, QueryResult } from '../types';
import { getDb, refreshDb, executeQuery } from '../services/api';
import { handleApiError } from '../utils/errors';

const { Title, Text } = Typography;

export const DatabaseDetailPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [database, setDatabase] = useState<DatabaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executingQuery, setExecutingQuery] = useState(false);

  const loadDatabase = useCallback(async () => {
    if (!name) return;

    setLoading(true);
    try {
      const data = await getDb(name);
      setDatabase(data);
    } catch (error: unknown) {
      message.error(handleApiError(error, '加载数据库失败'));
    } finally {
      setLoading(false);
    }
  }, [name]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleRefresh = async () => {
    if (!name) return;

    setRefreshing(true);
    try {
      const data = await refreshDb(name);
      setDatabase(data);
      message.success('元数据已刷新');
    } catch (error: unknown) {
      message.error(handleApiError(error, '刷新失败'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleExecuteQuery = async () => {
    if (!name || !sqlQuery.trim()) return;

    setExecutingQuery(true);
    try {
      const result = await executeQuery(name, { sql: sqlQuery });
      setQueryResult(result);
      message.success(`查询执行成功，返回 ${result.totalCount} 行`);
    } catch (error: unknown) {
      message.error(handleApiError(error, '查询执行失败'));
    } finally {
      setExecutingQuery(false);
    }
  };

  const handleBack = () => {
    navigate('/databases');
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card style={{ height: '400px' }}>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </Col>
          <Col span={18}>
            <Card style={{ height: '400px' }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  if (!database) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">数据库不存在</Text>
      </div>
    );
  }

  const statusConfig: Record<string, { color: string; text: string }> = {
    active: { color: 'success', text: '活跃' },
    error: { color: 'error', text: '错误' },
  };

  const statusInfo = statusConfig[database.status] || { color: 'default', text: database.status };

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 48px)' }}>
      <Row gutter={16} style={{ height: '100%' }}>
        {/* Left Sidebar - Schema Tree */}
        <Col span={6} style={{ height: '100%', overflow: 'auto' }}>
          <Card
            title={
              <Space>
                <DatabaseOutlined />
                <Text ellipsis style={{ maxWidth: '150px' }}>
                  {database.name}
                </Text>
              </Space>
            }
            extra={
              <Button
                type="text"
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={handleRefresh}
                loading={refreshing}
                size="small"
              />
            }
            styles={{ body: { padding: '8px', maxHeight: 'calc(100vh - 200px)', overflow: 'auto' } }}
            style={{ height: '100%' }}
          >
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Space size="small">
                <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {database.dbType}
                </Text>
              </Space>

              <SchemaTree tables={database.tables} loading={refreshing} />
            </Space>
          </Card>
        </Col>

        {/* Main Area - Query Editor and Results */}
        <Col span={18} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* SQL Editor Section */}
          <Card
            title={
              <Space>
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBack}
                />
                <Title level={4} style={{ margin: 0 }}>
                  SQL 查询编辑器
                </Title>
              </Space>
            }
            style={{ marginBottom: '16px', flex: '0 0 auto' }}
            styles={{ body: { padding: '16px', height: '250px' } }}
          >
            <SqlEditor
              value={sqlQuery}
              onChange={setSqlQuery}
              onExecute={handleExecuteQuery}
              loading={executingQuery}
              placeholder="在此输入 SQL 查询语句... 例如: SELECT * FROM test_users LIMIT 10"
            />
          </Card>

          {/* Results Section */}
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  查询结果
                </Title>
              </Space>
            }
            style={{ flex: 1, overflow: 'hidden' }}
            styles={{ body: { padding: '16px', height: 'calc(100% - 50px)' } }}
          >
            <ResultTable result={queryResult} loading={executingQuery} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DatabaseDetailPage;
