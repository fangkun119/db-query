import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Typography, message, Skeleton } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import DatabaseList from '../components/database/database-list';
import DatabaseForm from '../components/database/database-form';
import type { DatabaseSummary } from '../types';
import { listDbs, deleteDb } from '../services/api';
import { handleApiError } from '../utils/errors';

const { Title } = Typography;

export const DatabasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState<DatabaseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const loadDatabases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDbs();
      setDatabases(data);
    } catch (error: unknown) {
      message.error(handleApiError(error, '加载数据库列表失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDelete = async (name: string) => {
    try {
      await deleteDb(name);
      message.success('数据库连接已删除');
      loadDatabases();
    } catch (error: unknown) {
      message.error(handleApiError(error, '删除失败'));
    }
  };

  const handleClick = (name: string) => {
    navigate(`/databases/${encodeURIComponent(name)}`);
  };

  const handleAddSuccess = () => {
    loadDatabases();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <Card>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Title level={3} style={{ margin: 0 }}>数据库连接</Title>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadDatabases}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setFormOpen(true)}
              >
                添加数据库
              </Button>
            </Space>
          </Space>

          {loading && databases.length === 0 ? (
            <div style={{ padding: '16px 0' }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ) : databases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>
              暂无数据库连接，点击上方"添加数据库"按钮添加第一个连接
            </div>
          ) : (
            <DatabaseList
              databases={databases}
              onDelete={handleDelete}
              onClick={handleClick}
            />
          )}
        </Space>
      </Card>

      <DatabaseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};

export default DatabasesPage;
