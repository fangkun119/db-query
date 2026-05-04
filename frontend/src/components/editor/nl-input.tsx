import React, { useState } from 'react';
import { Input, Alert } from 'antd';

const { TextArea } = Input;

interface NLInputProps {
  onGenerate: (prompt: string) => void;
  loading?: boolean;
  error?: string | null;
}

export const NLInput: React.FC<NLInputProps> = ({
  onGenerate,
  loading = false,
  error = null,
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
      // The prompt is already saved via handleChange
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TextArea
        value={prompt}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        placeholder="Ask questions about your data in plain Chinese or English ... e.g., show user orders
The generated SQL will be validated before executio and click &quot;Execute Query&quot; button or press &quot;Ctrl / CMD + Enter&quot; to run the generated SQL"
        disabled={loading}
        style={{
          fontSize: '14px',
          flex: 1,
          resize: 'none',
          minHeight: '200px',
        }}
      />

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          style={{ marginTop: '12px', fontSize: '12px' }}
        />
      )}
    </div>
  );
};

export default NLInput;
