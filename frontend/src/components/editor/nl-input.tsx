import React, { useState } from 'react';
import { Input, Button, Space, Alert, Typography } from 'antd';
import { BulbOutlined, LoadingOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

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

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
      // Don't clear input after generation - user may want to try again
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Generate on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <BulbOutlined style={{ color: '#1890ff' }} />
          <Text strong>Natural Language to SQL</Text>
        </Space>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Ctrl+Enter to generate
        </Text>
      </Space>

      <TextArea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Ask a question in Chinese... e.g., 显示所有用户的订单数量"
        autoSize={{ minRows: 4, maxRows: 8 }}
        disabled={loading}
        style={{ fontSize: '14px' }}
      />

      <Button
        type="primary"
        onClick={handleGenerate}
        loading={loading}
        icon={loading ? <LoadingOutlined /> : undefined}
        disabled={!prompt.trim()}
        block
        style={{ height: '40px', fontWeight: 600 }}
      >
        {loading ? 'Generating...' : 'Generate SQL'}
      </Button>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          style={{ fontSize: '12px' }}
        />
      )}

      <Alert
        message={
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#595959' }}>
            <li>Ask questions about your data in plain Chinese</li>
            <li>The generated SQL will be validated before execution</li>
            <li>Click "Execute Query" button to run the generated SQL</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ fontSize: '12px' }}
      />
    </div>
  );
};

export default NLInput;
