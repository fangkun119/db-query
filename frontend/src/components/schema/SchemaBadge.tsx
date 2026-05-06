import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

type BadgeVariant = 'type' | 'pk' | 'nullable' | 'table-kind';

interface SchemaBadgeProps {
  variant: BadgeVariant;
  label: string;
  title?: string;
}

const BADGE_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  type: {
    fontSize: '9px',
    fontWeight: 'bold',
    padding: '2px 6px',
    border: '1px solid #333333',
    backgroundColor: '#ffffff',
    borderRadius: '2px',
    fontFamily: 'sans-serif',
  },
  pk: {
    fontSize: '9px',
    fontWeight: 'bold',
    padding: '2px 6px',
    backgroundColor: '#FFE6E6',
    borderRadius: '2px',
    fontFamily: 'sans-serif',
  },
  nullable: {
    fontSize: '9px',
    fontWeight: 'bold',
    padding: '2px 6px',
    backgroundColor: '#f0e6fa',
    borderRadius: '2px',
    fontFamily: 'sans-serif',
  },
  'table-kind': {
    fontSize: '9px',
    fontWeight: 'bold',
    padding: '2px 6px',
    backgroundColor: '#F8F8F8',
    color: '#333333',
    borderRadius: '2px',
    fontFamily: 'sans-serif',
  },
};

export const SchemaBadge: React.FC<SchemaBadgeProps> = ({ variant, label, title }) => {
  return (
    <span style={BADGE_STYLES[variant]} title={title}>
      {label}
    </span>
  );
};

export default SchemaBadge;
