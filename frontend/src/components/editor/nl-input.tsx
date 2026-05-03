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
      setPrompt(''); // Clear input after generation
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        autoSize={{ minRows: 2, maxRows: 4 }}
        disabled={loading}
      />

      <Button
        type="primary"
        onClick={handleGenerate}
        loading={loading}
        icon={loading ? <LoadingOutlined /> : undefined}
        disabled={!prompt.trim()}
        block
      >
        {loading ? 'Generating SQL...' : 'Generate SQL'}
      </Button>

      {error && (
        <Alert
          message="Generation Failed"
          description={error}
          type="error"
          showIcon
          closable
        />
      )}

      <Alert
        message="Tips"
        description={
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
            <li>Ask questions about your data in plain Chinese</li>
            <li>The generated SQL will be validated before inserting into the editor</li>
            <li>You can edit the generated SQL before executing</li>
          </ul>
        }
        type="info"
        showIcon
      />
    </div>
  );
};

export default NLInput;
