import React, { useState, useMemo, useCallback } from 'react';
import { Modal } from 'antd';
import DatabaseForm from './database-form';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { Column } from '../layout/Column';
import { DatabaseSidebar, SchemaBrowser, SchemaBrowserEmpty, QueryPanel, QueryPanelEmpty } from '../workspace';
import { COLORS, COLUMN_SPAN_AUTO, COLUMN_SPAN_FULL } from '../../constants';

export const DatabaseWorkspace: React.FC = () => {
  const workspace = useWorkspaceState();
  const { height: editorHeight, handleMouseDown } = useResizablePanel();
  const [formOpen, setFormOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredTables = useMemo(() => {
    if (!workspace.selectedDatabase) return [];
    const searchLower = searchValue.toLowerCase();
    return workspace.selectedDatabase.tables.filter(
      (table) =>
        table.tableName.toLowerCase().includes(searchLower) ||
        table.schemaName.toLowerCase().includes(searchLower) ||
        table.columns.some((col) => col.name.toLowerCase().includes(searchLower))
    );
  }, [workspace.selectedDatabase, searchValue]);

  const handleAddSuccess = useCallback(() => {
    workspace.loadDatabases();
  }, [workspace.loadDatabases]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Column span={COLUMN_SPAN_AUTO}>
          <DatabaseSidebar
            databases={workspace.databases}
            selectedName={workspace.selectedDatabase?.name}
            loading={workspace.loadingDatabases}
            onAddClick={() => setFormOpen(true)}
            onClick={workspace.handleDatabaseClick}
            onDelete={workspace.handleDatabaseDelete}
          />
        </Column>

        <Column span={COLUMN_SPAN_AUTO}>
          {workspace.selectedDatabase ? (
            <SchemaBrowser
              database={workspace.selectedDatabase}
              loading={workspace.loadingDatabase}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onRefresh={workspace.handleRefresh}
              filteredTables={filteredTables}
            />
          ) : (
            <SchemaBrowserEmpty />
          )}
        </Column>

        <Column span={COLUMN_SPAN_FULL}>
          {workspace.selectedDatabase ? (
            <QueryPanel
              queryResult={workspace.queryResult}
              executingQuery={workspace.executingQuery}
              editorHeight={editorHeight}
              sqlQuery={workspace.sqlQuery}
              activeTab={workspace.activeTab}
              nlPrompt={workspace.nlPrompt}
              onSqlChange={workspace.setSqlQuery}
              onTabChange={workspace.setActiveTab}
              onNlPromptChange={workspace.setNlPrompt}
              onExecuteQuery={workspace.handleExecuteQuery}
              onResizerMouseDown={handleMouseDown}
            />
          ) : (
            <QueryPanelEmpty />
          )}
        </Column>
      </div>

      <DatabaseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};

export default DatabaseWorkspace;
