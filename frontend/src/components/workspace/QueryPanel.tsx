import React from 'react';
import { Button, Empty, Space, Typography, Tabs, Popover } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { SqlEditor, NLInput } from '../editor';
import { ResultTable } from '../results/result-table';
import { PANEL_HEADER_STYLES, BUTTON_PRIMARY_STYLES, SQL_POPOVER_STYLES, BADGE_STYLES } from '../../styles/common';
import { COLORS, RESIZER_HEIGHT } from '../../constants';
import type { QueryResult } from '../../types';

const { Title, Text } = Typography;

interface QueryPanelProps {
  queryResult: QueryResult | null;
  executingQuery: boolean;
  editorHeight: number;
  sqlQuery: string;
  activeTab: 'manual' | 'natural';
  nlPrompt: string;
  onSqlChange: (sql: string) => void;
  onTabChange: (tab: 'manual' | 'natural') => void;
  onNlPromptChange: (prompt: string) => void;
  onExecuteQuery: () => void;
  onResizerMouseDown: (e: React.MouseEvent) => void;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({
  queryResult,
  executingQuery,
  editorHeight,
  sqlQuery,
  activeTab,
  nlPrompt,
  onSqlChange,
  onTabChange,
  onNlPromptChange,
  onExecuteQuery,
  onResizerMouseDown,
}) => {
  return (
    <div style={{ flex: 1, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: '0 0 auto', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff', height: `${editorHeight}px`, overflow: 'hidden' }}>
        <div style={{ ...PANEL_HEADER_STYLES, justifyContent: 'space-between', backgroundColor: '#F5F5F5' }}>
          <Title level={5} style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#262626' }}>
            QUERY EDITOR
          </Title>
          <Button
            icon={<PlayCircleOutlined style={{ fontSize: '16px' }} />}
            onClick={onExecuteQuery}
            loading={executingQuery}
            disabled={activeTab === 'manual' ? !sqlQuery.trim() : !nlPrompt.trim()}
            style={{ ...BUTTON_PRIMARY_STYLES, height: '44px', padding: '0 20px', fontSize: '14px' }}
          >
            Execute Query
          </Button>
        </div>

        <div style={{ ...PANEL_HEADER_STYLES, backgroundColor: COLORS.BACKGROUND_LIGHT }}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => onTabChange(key as 'manual' | 'natural')}
            tabBarStyle={{ fontWeight: 600 }}
            items={[
              { key: 'manual', label: 'MANUAL SQL' },
              { key: 'natural', label: 'NATURAL LANGUAGE' },
            ]}
          />
        </div>

        <div style={{ height: `calc(${editorHeight}px - 120px)`, overflow: 'hidden' }}>
          {activeTab === 'manual' ? (
            <div style={{ height: '100%', overflow: 'hidden' }}>
              <SqlEditor
                value={sqlQuery}
                onChange={onSqlChange}
                onExecute={onExecuteQuery}
              />
            </div>
          ) : (
            <div style={{ height: '100%', overflow: 'hidden' }}>
              <NLInput
                value={nlPrompt}
                onChange={onNlPromptChange}
                onExecute={onExecuteQuery}
                loading={executingQuery}
              />
            </div>
          )}
        </div>
      </div>

      <div
        onMouseDown={onResizerMouseDown}
        style={{
          height: `${RESIZER_HEIGHT}px`,
          backgroundColor: COLORS.BORDER,
          cursor: 'row-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderTop: '1px solid #e8e8e8',
          borderBottom: '1px solid #e8e8e8',
          transition: 'background-color 0.2s',
          position: 'relative',
          zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d9d9d9'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = COLORS.BORDER; }}
      >
        <div style={{ width: '40px', height: '2px', backgroundColor: '#b0b0b0', borderRadius: '1px' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#fff', minHeight: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, backgroundColor: COLORS.BACKGROUND_LIGHT }}>
          <Space>
            <Title level={5} style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
              RESULTS
            </Title>
            {queryResult && (
              <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                - {queryResult.totalCount} ROWS - {queryResult.executionTimeMs}MS
              </Text>
            )}
          </Space>
          {sqlQuery && queryResult && (
            <Popover
              content={
                <div style={{ maxWidth: 600 }}>
                  <pre style={SQL_POPOVER_STYLES}>{sqlQuery}</pre>
                </div>
              }
              trigger="hover"
              placement="bottomRight"
              overlayStyle={{ maxWidth: 600 }}
            >
              <span style={BADGE_STYLES}>SQL</span>
            </Popover>
          )}
        </div>
        <div style={{ padding: '16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ResultTable result={queryResult} loading={executingQuery} />
        </div>
      </div>
    </div>
  );
};

export const QueryPanelEmpty: React.FC = () => {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Select a database to start querying"
      />
    </div>
  );
};

export default QueryPanel;
