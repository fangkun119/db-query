import React, { useState } from 'react';
import { Modal, Form, Input, message, Space, Typography, Radio } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CreateConnectionRequest } from '../../types';
import type { DatabaseType } from '../../types';
import { addDb } from '../../services/api';
import { handleApiError } from '../../utils/errors';

const { Text } = Typography;

interface DatabaseFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const URL_PATTERNS: Record<DatabaseType, RegExp> = {
  postgresql: /^postgresql:\/\/|^postgresql\+asyncpg:\/\//,
  mysql: /^mysql:\/\//,
};

const URL_FORMATS: Record<DatabaseType, string> = {
  postgresql: 'postgresql://username:password@host:port/database',
  mysql: 'mysql://username:password@host:port/database',
};

const URL_PLACEHOLDERS: Record<DatabaseType, string> = {
  postgresql: 'postgresql://user:password@localhost:5432/mydb',
  mysql: 'mysql://user:password@localhost:3306/mydb',
};

export const DatabaseForm: React.FC<DatabaseFormProps> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dbType, setDbType] = useState<DatabaseType>('postgresql');

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const request: CreateConnectionRequest = {
        url: values.url,
      };

      await addDb(values.name, request);
      message.success('Database connection added successfully');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // Validation error, do nothing
      } else {
        message.error(handleApiError(error, 'Failed to add, please try again'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          <span>Add Database Connection</span>
        </Space>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Add"
      cancelText="Cancel"
      confirmLoading={loading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Connection Name"
          name="name"
          rules={[
            { required: true, message: 'Please enter a connection name' },
            { max: 100, message: 'Connection name cannot exceed 100 characters' },
            { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Connection name can only contain letters, numbers, underscores, and hyphens' },
          ]}
        >
          <Input placeholder="e.g., my-postgres" />
        </Form.Item>

        <Form.Item
          label="Database Type"
          name="dbType"
          initialValue="postgresql"
        >
          <Radio.Group
            value={dbType}
            onChange={(e) => {
              setDbType(e.target.value);
              form.setFieldValue('url', '');
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="postgresql">PostgreSQL</Radio.Button>
            <Radio.Button value="mysql">MySQL</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="Database Connection URL"
          name="url"
          rules={[
            { required: true, message: `Please enter ${dbType} connection URL` },
            {
              pattern: URL_PATTERNS[dbType],
              message: `URL must start with ${dbType}://`
            },
          ]}
          extra={
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Format: {URL_FORMATS[dbType]}
            </Text>
          }
        >
          <Input.Password
            placeholder={URL_PLACEHOLDERS[dbType]}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item>
          <Space orientation="vertical" size="small">
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Tips:
            </Text>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#8c8c8c' }}>
              <li>Database metadata will be automatically fetched after successful connection</li>
              <li>Ensure the database service is accessible</li>
              <li>Connection information will be stored locally in plain text</li>
              <li>{dbType === 'postgresql' ? 'Default PostgreSQL port: 5432' : 'Default MySQL port: 3306'}</li>
            </ul>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DatabaseForm;
