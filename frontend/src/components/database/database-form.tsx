import React, { useState } from 'react';
import { Modal, Form, Input, message, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CreateConnectionRequest } from '../../types';
import { addDb } from '../../services/api';
import { handleApiError } from '../../utils/errors';

const { Text } = Typography;

interface DatabaseFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DatabaseForm: React.FC<DatabaseFormProps> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
          label="PostgreSQL Connection URL"
          name="url"
          rules={[
            { required: true, message: 'Please enter PostgreSQL connection URL' },
            {
              pattern: /^postgresql:\/\/|^postgresql\+asyncpg:\/\//,
              message: 'URL must start with postgresql:// or postgresql+asyncpg://'
            },
          ]}
          extra={
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Format: postgresql://username:password@host:port/database
            </Text>
          }
        >
          <Input.Password
            placeholder="postgresql://user:password@localhost:5432/mydb"
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
            </ul>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DatabaseForm;
