import React from 'react';
import { Badge, Button, Typography, Space, Popconfirm, Tag } from 'antd';
import { DeleteOutlined, DatabaseOutlined } from '@ant-design/icons';
import type { DatabaseSummary } from '../../types';

const { Text } = Typography;

interface DatabaseListProps {
  databases: DatabaseSummary[];
  onDelete: (name: string) => void;
  onClick: (name: string) => void;
}

const statusConfig: Record<string, { color: string; text: string }> = {
  active: { color: 'success', text: '活跃' },
  error: { color: 'error', text: '错误' },
};

const formatDistanceToNow = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = {
    年: 31536000,
    月: 2592000,
    周: 604800,
    天: 86400,
    小时: 3600,
    分钟: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit}前`;
    }
  }

  return '刚刚';
};

export const DatabaseList: React.FC<DatabaseListProps> = ({ databases, onDelete, onClick }) => {
  const handleDelete = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(name);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {databases.map((db) => {
        const statusInfo = statusConfig[db.status] || { color: 'default', text: db.status };
        const lastRefreshed = db.lastRefreshedAt
          ? formatDistanceToNow(db.lastRefreshedAt)
          : '从未刷新';

        return (
          <div
            key={db.name}
            onClick={() => onClick(db.name)}
            style={{
              cursor: 'pointer',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              borderBottom: '1px solid #f0f0f0',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            className="database-list-item"
          >
            <DatabaseOutlined style={{ fontSize: '24px', color: '#1890ff', marginTop: '4px', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Space>
                <Text strong>{db.name}</Text>
                <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
              </Space>
              <Space orientation="vertical" size="small" style={{ width: '100%', marginTop: '4px' }}>
                <Text type="secondary">{db.dbType}</Text>
                <Space>
                  <Badge count={db.tableCount} showZero color="blue" />
                  <Text type="secondary">个表</Text>
                  <Badge count={db.viewCount} showZero color="green" />
                  <Text type="secondary">个视图</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  最后刷新: {lastRefreshed}
                </Text>
              </Space>
            </div>
            <Popconfirm
              title="删除连接"
              description="确定要删除这个数据库连接吗？"
              onConfirm={(e) => handleDelete(db.name, e as any)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </div>
        );
      })}
    </div>
  );
};

export default DatabaseList;
