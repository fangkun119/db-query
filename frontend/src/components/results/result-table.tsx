import React from 'react';
import { Table, Alert, Typography } from 'antd';
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
        Results will be displayed here after query execution
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
        Executing query...
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // Generate table columns from query result (uppercase column names)
  const columns = result.columnNames.map((name) => ({
    title: name.toUpperCase(),
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
      {/* Truncation warning - only show if rows exceed 1000 */}
      {result.isTruncated && result.totalCount >= 1000 && (
        <Alert
          message={`Max ${result.totalCount} rows displayed (LIMIT automatically set)`}
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
            showTotal: (total) => `Total ${total} row${total !== 1 ? 's' : ''}`,
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
