import React, { useMemo } from 'react';
import { Tree, Typography, Tooltip } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { TableOutlined } from '@ant-design/icons';
import type { TableMeta } from '../../types';
import { SchemaBadge } from './SchemaBadge';

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
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontFamily: 'sans-serif' }}>
              <Tooltip title={col.comment} mouseEnterDelay={0.3}>
                <Text strong style={{ fontSize: '13px', fontFamily: 'sans-serif' }}>{col.name}</Text>
              </Tooltip>
              <SchemaBadge variant="type" label={col.dataType.toUpperCase()} />
              {col.isPrimaryKey && <SchemaBadge variant="pk" label="PK" />}
              {!col.isNullable && <SchemaBadge variant="nullable" label="NOT NULL" />}
            </div>
          ),
          isLeaf: true,
        }));

        return {
          key: `${schemaName}.${table.tableName}`,
          title: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'sans-serif' }}>
              <Tooltip title={table.comment} mouseEnterDelay={0.3}>
                <Text strong style={{ fontSize: '13px', fontFamily: 'sans-serif' }}>{table.tableName}</Text>
              </Tooltip>
              <SchemaBadge variant="table-kind" label={isView ? 'VIEW' : 'TABLE'} />
            </div>
          ),
          children: columnNodes,
        };
      });

      nodes.push({
        key: schemaName,
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'sans-serif' }}>
            <TableOutlined style={{ fontSize: '14px', color: '#333333' }} />
            <Text strong style={{ fontSize: '14px', fontFamily: 'sans-serif' }}>Tables</Text>
          </div>
        ),
        children: tableNodes,
      });
    });

    return nodes;
  }, [tables]);

  if (tables.length === 0 && !loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">No metadata, please refresh connection</Text>
      </div>
    );
  }

  return (
    <Tree
      defaultExpandAll
      treeData={treeData}
      showLine={true}
      className="schema-tree-compact"
    />
  );
};

export default SchemaTree;
