import React from 'react';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { SQL_MODAL_STYLES } from '../styles/common';

interface ErrorSqlModalProps {
  visible: boolean;
  title: string;
  message: string;
  sql?: string;
  onClose: () => void;
}

export const ErrorSqlModal: React.FC<ErrorSqlModalProps> = ({
  visible,
  title,
  message,
  sql,
  onClose,
}) => {
  return (
    <Modal
      open={visible}
      title={title}
      icon={<ExclamationCircleOutlined />}
      onOk={onClose}
      onCancel={onClose}
      width={700}
      okText="Close"
      cancelButtonProps={{ style: { display: 'none' } }}
    >
      <div>
        <p>{message}</p>
        {sql && (
          <>
            <p style={{ fontWeight: 600, marginTop: 16 }}>SQL:</p>
            <pre style={SQL_MODAL_STYLES}>{sql}</pre>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ErrorSqlModal;
