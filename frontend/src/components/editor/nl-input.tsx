import React, { useState } from 'react';
import { Input, Alert } from 'antd';

const { TextArea } = Input;

interface NLInputProps {
  onGenerate: (prompt: string) => void;
  onExecute: () => void;
  loading?: boolean;
}

export const NLInput: React.FC<NLInputProps> = ({
  onGenerate,
  onExecute,
  loading = false,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);
    // Immediately notify parent of changes
    onGenerate(value);
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
        value={prompt}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        placeholder="
Ask questions about your data in plain Chinese or English ... e.g., &quot;show user orders&quot;.

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
