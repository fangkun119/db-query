import React from 'react';
import { Button, Typography, Space, Popconfirm, Tag } from 'antd';
import { DeleteOutlined, DatabaseOutlined } from '@ant-design/icons';
import type { DatabaseSummary } from '../../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);
dayjs.locale('en');

const { Text } = Typography;

interface DatabaseListProps {
  databases: DatabaseSummary[];
  selectedName?: string;
  onDelete: (name: string) => void;
  onClick: (name: string) => void;
}

const statusConfig: Record<string, { color: string; text: string }> = {
  error: { color: 'error', text: 'Error' },
};

export const DatabaseList: React.FC<DatabaseListProps> = ({ databases, selectedName, onDelete, onClick }) => {
  const handleDelete = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(name);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
      {databases.map((db) => {
        const statusInfo = statusConfig[db.status];
        const lastRefreshed = db.lastRefreshedAt
          ? dayjs(db.lastRefreshedAt).fromNow()
          : 'Never';

        const isSelected = db.name === selectedName;

        return (
          <div
            key={db.name}
            onClick={() => onClick(db.name)}
            style={{
              cursor: 'pointer',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
              backgroundColor: isSelected ? '#E8F4FD' : '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = '#fff';
            }}
            className="database-list-item"
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* First row: Icon + Database Name + Delete Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Space>
                  <DatabaseOutlined style={{ fontSize: '16px', color: '#333333' }} />
                  <Text strong style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'sans-serif', color: '#333333' }}>
                    {db.name.toUpperCase()}
                  </Text>
                  {statusInfo && (
                    <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                  )}
                </Space>
                <Popconfirm
                  title="Delete Connection"
                  description="Are you sure you want to delete this database connection?"
                  onConfirm={(e) => {
                    if (e) {
                      handleDelete(db.name, e as React.MouseEvent);
                    }
                  }}
                  okText="Confirm"
                  cancelText="Cancel"
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: '#DC3545' }}
                  />
                </Popconfirm>
              </div>
              {/* Second row: Info */}
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '14px', color: '#666666', fontWeight: 600, fontFamily: 'sans-serif' }}>
                  {db.dbType}
                </Text>
                <Text type="secondary" style={{ fontSize: '14px', color: '#666666', fontWeight: 600, fontFamily: 'sans-serif' }}>
                  {db.tableCount} tables, {db.viewCount} views
                </Text>
                <Text type="secondary" style={{ fontSize: '14px', color: '#666666', fontWeight: 600, fontFamily: 'sans-serif' }}>
                  Last updated: {lastRefreshed}
                </Text>
              </Space>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DatabaseList;
