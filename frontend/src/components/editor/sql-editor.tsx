import React, { useRef } from 'react';
import { Button, Space } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import type { editor } from 'monaco-editor';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  loading?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  onExecute,
  loading = false,
  placeholder = '在此输入 SQL 查询语句...\n例如: SELECT * FROM users LIMIT 10',
  readOnly = false,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;

    // Add keyboard shortcut for execution (Ctrl+Enter / Cmd+Enter)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecute();
    });

    // Set focus on mount
    editor.focus();
  };

  // Register SQL completion provider
  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: '200px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
        <Editor
          height="100%"
          defaultLanguage="pgsql"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            readOnly,
            placeholder,
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
          }}
        />
      </div>
      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onExecute}
            loading={loading}
            disabled={!value.trim() || readOnly}
          >
            执行查询
          </Button>
        </Space>
        <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
          快捷键: Ctrl/Cmd + Enter
        </span>
      </div>
    </div>
  );
};

export default SqlEditor;
