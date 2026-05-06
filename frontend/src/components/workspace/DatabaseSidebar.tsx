import React from 'react';
import { Button, Spin, Empty, Space } from 'antd';
import { PlusOutlined, DatabaseOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import DatabaseList from '../database/database-list';
import { PANEL_HEADER_STYLES, BUTTON_PRIMARY_STYLES } from '../../styles/common';
import { COLORS } from '../../constants';
import type { DatabaseSummary } from '../../types';

const { Title } = Typography;

interface DatabaseSidebarProps {
  databases: DatabaseSummary[];
  selectedName?: string;
  loading: boolean;
  onAddClick: () => void;
  onClick: (name: string) => void;
  onDelete: (name: string) => void;
}

export const DatabaseSidebar: React.FC<DatabaseSidebarProps> = ({
  databases,
  selectedName,
  loading,
  onAddClick,
  onClick,
  onDelete,
}) => {
  return (
    <div style={{ width: '260px', borderRight: '1px solid #f0f0f0', backgroundColor: COLORS.BACKGROUND_DARK, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...PANEL_HEADER_STYLES, backgroundColor: '#F5F5F5' }}>
        <DatabaseOutlined style={{ fontSize: '18px', color: '#595959', marginRight: '8px' }} />
        <Title level={5} style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#262626' }}>
          DB QUERY TOOL
        </Title>
      </div>
      <div style={{ ...PANEL_HEADER_STYLES, backgroundColor: '#F5F5F5', display: 'flex', alignItems: 'center' }}>
        <Button
          icon={<PlusOutlined />}
          onClick={onAddClick}
          style={{ width: '100%', ...BUTTON_PRIMARY_STYLES }}
        >
          ADD DATABASE
        </Button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
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
            selectedName={selectedName}
            onDelete={onDelete}
            onClick={onClick}
          />
        )}
      </div>
    </div>
  );
};

export default DatabaseSidebar;
