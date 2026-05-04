import React, { useRef, useEffect, useState } from 'react';
import { Table, Alert, Typography } from 'antd';
import type { QueryResult } from '../../types';

const { Text } = Typography;

interface ResultTableProps {
  result: QueryResult | null;
  loading?: boolean;
}

export const ResultTable: React.FC<ResultTableProps> = ({ result, loading = false }) => {
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [tableScrollY, setTableScrollY] = useState<number>(0);

  // Use ResizeObserver to dynamically calculate table scroll height
  useEffect(() => {
    if (!tableWrapperRef.current || !result) return;

    const updateTableHeight = () => {
      const wrapper = tableWrapperRef.current;
      if (!wrapper) return;

      // Get the actual height of the table wrapper
      const wrapperHeight = wrapper.clientHeight;

      // Find table header and pagination elements within the wrapper
      const tableHeader = wrapper.querySelector('.ant-table-thead');
      const pagination = wrapper.querySelector('.ant-pagination');

      // Calculate actual heights
      const headerHeight = tableHeader ? tableHeader.clientHeight : 40;
      const paginationHeight = pagination ? pagination.clientHeight : 55;

      // Calculate available height for table body (tbody)
      // Reserve space for header and pagination
      const scrollY = Math.max(wrapperHeight - headerHeight - paginationHeight - 16, 200); // 16px for internal margins, min 200px

      setTableScrollY(scrollY);
    };

    // Initial calculation
    updateTableHeight();

    // Use ResizeObserver to watch for size changes
    const resizeObserver = new ResizeObserver(updateTableHeight);
    resizeObserver.observe(tableWrapperRef.current);

    // Also observe the window for any changes
    window.addEventListener('resize', updateTableHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateTableHeight);
    };
  }, [result]);

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Truncation warning - only show if rows exceed 1000 */}
      {result.isTruncated && result.totalCount >= 1000 && (
        <Alert
          message={`Max ${result.totalCount} rows displayed (LIMIT automatically set)`}
          type="warning"
          showIcon
          style={{ marginBottom: '12px', flexShrink: 0 }}
        />
      )}

      {/* Results table wrapper */}
      <div ref={tableWrapperRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} row${total !== 1 ? 's' : ''}`,
            size: 'small',
            position: 'bottom',
          }}
          size="small"
          scroll={{ x: 'max-content', y: tableScrollY }}
          bordered
        />
      </div>
    </div>
  );
};

export default ResultTable;
