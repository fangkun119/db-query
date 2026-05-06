import React from 'react';
import { Input } from 'antd';

const { TextArea } = Input;

interface NLInputProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  loading?: boolean;
}

export const NLInput: React.FC<NLInputProps> = ({
  value,
  onChange,
  onExecute,
  loading = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Execute on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onExecute();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TextArea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        placeholder="
Ask questions about your data in English or Chinese (e.g., 'show user orders' or '显示所有用户').

The generated SQL will be validated before execution.
Click &quot;Execute Query&quot; button or press &quot;Ctrl / CMD + Enter&quot; to run."
        disabled={loading}
        style={{
          fontSize: '14px',
          flex: 1,
          resize: 'none',
          minHeight: '200px',
        }}
      />
    </div>
  );
};

export default NLInput;
