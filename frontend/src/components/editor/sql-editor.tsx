import React from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  placeholder?: string;
  readOnly?: boolean;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  onExecute,
  placeholder = `
Enter SQL query... e.g., "select * from users limit 10".

Click "Execute Query" button or press "Ctrl / CMD + Enter" to run.`,
  readOnly = false,
}) => {
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    // Set focus on mount
    editor.focus();

    // Add Ctrl/CMD + Enter shortcut for execution
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onExecute) {
        onExecute();
      }
    });
  };

  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        className="sql-editor-container"
        style={{
          flex: 1,
          minHeight: '200px',
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
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
        <style>{`
          .sql-editor-container > div {
            border-radius: 6px !important;
          }
          .sql-editor-container .monaco-editor {
            border-radius: 6px !important;
          }
          .sql-editor-container .monaco-editor .overflow-guard {
            border-radius: 6px !important;
          }
        `}</style>
      </div>
    </div>
  );
};

export default SqlEditor;
