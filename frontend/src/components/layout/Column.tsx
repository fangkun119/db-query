import React from 'react';
import { COLUMN_SPAN_AUTO, COLUMN_SPAN_FULL } from '../../constants';

interface ColumnProps {
  span: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const Column: React.FC<ColumnProps> = ({ span, style, children }) => (
  <div
    style={{
      flex: span === COLUMN_SPAN_AUTO ? '0 0 auto' : span,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    {children}
  </div>
);

export default Column;
