import React, { useState } from 'react';
import { Modal, Form, Input, message, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CreateConnectionRequest } from '../../types';
import { addDb } from '../../services/api';

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
      message.success('数据库连接添加成功');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.response?.data?.detail) {
        message.error(`添加失败：${error.response.data.detail}`);
      } else if (error.errorFields) {
        // Validation error, do nothing
      } else {
        message.error('添加失败，请稍后重试');
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
          <span>添加数据库连接</span>
        </Space>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="添加"
      cancelText="取消"
      confirmLoading={loading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="连接名称"
          name="name"
          rules={[
            { required: true, message: '请输入连接名称' },
            { max: 100, message: '连接名称不能超过100个字符' },
            { pattern: /^[a-zA-Z0-9_-]+$/, message: '连接名称只能包含字母、数字、下划线和连字符' },
          ]}
        >
          <Input placeholder="例如: my-postgres" />
        </Form.Item>

        <Form.Item
          label="PostgreSQL 连接 URL"
          name="url"
          rules={[
            { required: true, message: '请输入PostgreSQL连接URL' },
            {
              pattern: /^postgresql:\/\/|^postgresql\+asyncpg:\/\//,
              message: 'URL必须以 postgresql:// 或 postgresql+asyncpg:// 开头'
            },
          ]}
          extra={
            <Text type="secondary" style={{ fontSize: '12px' }}>
              格式: postgresql://用户名:密码@主机:端口/数据库名
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
              提示：
            </Text>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#8c8c8c' }}>
              <li>连接成功后会自动获取数据库元数据</li>
              <li>请确保数据库服务可访问</li>
              <li>连接信息将以明文存储在本地</li>
            </ul>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DatabaseForm;
