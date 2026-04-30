import React from 'react';
import { Table, Alert, Space, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { QueryResult } from '../../types';

const { Text } = Typography;

interface ResultTableProps {
  result: QueryResult | null;
  loading?: boolean;
}

export const ResultTable: React.FC<ResultTableProps> = ({ result, loading = false }) => {
  if (!result && !loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#8c8c8c'
      }}>
        执行查询后结果将显示在这里
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#8c8c8c'
      }}>
        正在执行查询...
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // Generate table columns from query result
  const columns = result.columnNames.map((name) => ({
    title: name,
    dataIndex: name,
    key: name,
    width: 150,
    ellipsis: true,
    render: (value: unknown) => {
      if (value === null) {
        return <Text type="secondary">NULL</Text>;
      }
      if (value === undefined) {
        return <Text type="secondary">-</Text>;
      }
      return String(value);
    },
  }));

  // Prepare data for Ant Design Table
  const dataSource = result.rowData.map((row, index) => ({
    key: index,
    ...row,
  }));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Result header with stats */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size="middle">
          <Text>
            共 <Text strong>{result.totalCount}</Text> 行
          </Text>
          <Space size="small">
            <ClockCircleOutlined />
            <Text type="secondary">{result.executionTimeMs} ms</Text>
          </Space>
        </Space>
      </div>

      {/* Truncation warning */}
      {result.isTruncated && (
        <Alert
          message={`仅显示前 ${result.totalCount} 行（已自动添加 LIMIT 限制）`}
          type="warning"
          showIcon
          style={{ marginBottom: '12px' }}
        />
      )}

      {/* Results table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            size: 'small',
          }}
          size="small"
          scroll={{ x: 'max-content', y: 'calc(100vh - 450px)' }}
          bordered
        />
      </div>
    </div>
  );
};

export default ResultTable;
