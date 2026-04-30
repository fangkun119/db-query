import React, { useMemo } from 'react';
import { Tree, Badge, Tag, Space, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { TableOutlined, DatabaseOutlined, KeyOutlined } from '@ant-design/icons';
import type { TableMeta } from '../../types';

const { Text } = Typography;

interface SchemaTreeProps {
  tables: TableMeta[];
  loading?: boolean;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({ tables, loading = false }) => {
  const treeData = useMemo((): DataNode[] => {
    // Group tables by schema
    const schemaMap = new Map<string, TableMeta[]>();

    tables.forEach((table) => {
      if (!schemaMap.has(table.schemaName)) {
        schemaMap.set(table.schemaName, []);
      }
      schemaMap.get(table.schemaName)!.push(table);
    });

    // Convert to tree structure
    const nodes: DataNode[] = [];

    schemaMap.forEach((schemaTables, schemaName) => {
      const tableNodes: DataNode[] = schemaTables.map((table) => {
        const isView = table.tableType === 'VIEW';
        const columnNodes: DataNode[] = table.columns.map((col) => ({
          key: `${schemaName}.${table.tableName}.${col.name}`,
          title: (
            <Space size="small">
              <KeyOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
              <Text style={{ fontSize: '12px' }}>{col.name}</Text>
              <Tag color="default" style={{ fontSize: '11px', margin: 0 }}>
                {col.dataType}
              </Tag>
              {col.isNullable && (
                <Tag color="warning" style={{ fontSize: '11px', margin: 0 }}>
                  可空
                </Tag>
              )}
            </Space>
          ),
          isLeaf: true,
        }));

        return {
          key: `${schemaName}.${table.tableName}`,
          title: (
            <Space>
              {isView ? <DatabaseOutlined /> : <TableOutlined />}
              <Text>{table.tableName}</Text>
              <Badge
                count={table.columns.length}
                showZero
                style={{ backgroundColor: '#52c41a' }}
              />
            </Space>
          ),
          children: columnNodes,
        };
      });

      nodes.push({
        key: schemaName,
        title: (
          <Space>
            <DatabaseOutlined style={{ color: '#1890ff' }} />
            <Text strong>{schemaName}</Text>
            <Badge count={schemaTables.length} showZero />
          </Space>
        ),
        children: tableNodes,
      });
    });

    return nodes;
  }, [tables]);

  if (tables.length === 0 && !loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">暂无元数据，请刷新连接</Text>
      </div>
    );
  }

  return (
    <Tree
      showIcon
      defaultExpandAll
      treeData={treeData}
      style={{
        backgroundColor: '#fff',
        padding: '8px',
        borderRadius: '4px',
      }}
    />
  );
};

export default SchemaTree;
