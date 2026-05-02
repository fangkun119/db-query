import React from 'react';
import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import type { editor } from 'monaco-editor';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  loading = false,
  placeholder = '在此输入 SQL 查询语句...\n例如: SELECT * FROM users LIMIT 10',
  readOnly = false,
}) => {
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
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
    </div>
  );
};

export default SqlEditor;
