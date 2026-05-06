import React from 'react';
import { Button, Typography, Popconfirm } from 'antd';
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

const dbTypeText: Record<string, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
};

export const DatabaseList: React.FC<DatabaseListProps> = ({ databases, selectedName, onDelete, onClick }) => {
  const handleDelete = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(name);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
      {databases.map((db) => {
        const dbType = dbTypeText[db.dbType] || db.dbType.charAt(0).toUpperCase() + db.dbType.slice(1);
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
              backgroundColor: isSelected ? '#E8F4FD' : '#F5F5F5',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = '#EBEBEB';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = '#F5F5F5';
            }}
            className="database-list-item"
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* First row: Icon + Database Name + Delete Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <DatabaseOutlined style={{ fontSize: '16px', color: '#333333', flexShrink: 0 }} />
                  <Text strong style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'sans-serif', color: '#333333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {db.name.toUpperCase()}
                  </Text>
                </div>
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
                    style={{ color: '#DC3545', flexShrink: 0 }}
                  />
                </Popconfirm>
              </div>
              {/* Second row: Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Text type="secondary" style={{ fontSize: '13px', color: '#666666', fontWeight: 600, fontFamily: 'sans-serif' }}>
                  {dbType}
                </Text>
                <Text type="secondary" style={{ fontSize: '13px', color: '#666666', fontWeight: 600, fontFamily: 'sans-serif' }}>
                  {db.tableCount} tables, {db.viewCount} views
                </Text>
                <Text type="secondary" style={{ fontSize: '13px', color: '#666666', fontWeight: 600, fontFamily: 'sans-serif' }}>
                  Last updated: {lastRefreshed}
                </Text>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DatabaseList;
