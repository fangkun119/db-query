import React from 'react';
import { Button, Input, Spin, Space, Typography } from 'antd';
import { ReloadOutlined, TableOutlined, DatabaseOutlined } from '@ant-design/icons';
import SchemaTree from '../schema/schema-tree';
import { PANEL_HEADER_STYLES, SEARCH_INPUT_WRAPPER_STYLES, CENTERED_EMPTY_STATE_STYLES, BUTTON_PRIMARY_STYLES } from '../../styles/common';
import { COLORS } from '../../constants';
import type { DatabaseDetail, TableMeta } from '../../types';

const { Title } = Typography;

interface SchemaBrowserProps {
  database: DatabaseDetail;
  loading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  filteredTables: TableMeta[];
}

export const SchemaBrowser: React.FC<SchemaBrowserProps> = ({
  database,
  loading,
  searchValue,
  onSearchChange,
  onRefresh,
  filteredTables,
}) => {
  return (
    <div style={{ width: '380px', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...PANEL_HEADER_STYLES, backgroundColor: COLORS.PRIMARY }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space style={{ alignItems: 'center' }}>
            <TableOutlined style={{ fontSize: '18px', color: '#FFFFFF' }} />
            <Title level={5} style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }} ellipsis>
              {database.name}
            </Title>
          </Space>
          <Button
            icon={<ReloadOutlined spin={loading} style={{ color: '#B8860B', fontSize: '16px' }} />}
            onClick={onRefresh}
            loading={loading}
            style={{ backgroundColor: '#FFFFFF', border: 'none', fontWeight: 700, color: COLORS.PRIMARY, height: '44px', padding: '0 20px', fontSize: '14px' }}
          >
            REFRESH
          </Button>
        </Space>
      </div>
      <div style={SEARCH_INPUT_WRAPPER_STYLES}>
        <Input
          className="schema-search-input"
          placeholder="Search tables, columns..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
        />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Spin tip="Loading Schema..." />
          </div>
        ) : (
          <SchemaTree tables={filteredTables} loading={loading} />
        )}
      </div>
    </div>
  );
};

export const SchemaBrowserEmpty: React.FC = () => {
  return (
    <div style={{ width: '380px', borderRight: '1px solid #f0f0f0', ...CENTERED_EMPTY_STATE_STYLES }}>
      <div>
        <DatabaseOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
        <div>
          <Typography.Text type="secondary">Select a database from the left</Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default SchemaBrowser;
