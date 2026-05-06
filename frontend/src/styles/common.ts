import { COLORS } from '../constants';

export const SQL_MODAL_STYLES = {
  backgroundColor: '#f5f5f5',
  padding: '12px',
  borderRadius: '4px',
  fontSize: '12px',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-all' as const,
  maxHeight: '300px',
  overflow: 'auto' as const,
};

export const SQL_POPOVER_STYLES = {
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
  fontSize: '12px',
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
  backgroundColor: '#f5f5f5',
  padding: '8px',
  borderRadius: '4px',
};

export const BADGE_STYLES = {
  fontSize: '11px',
  fontWeight: 600,
  padding: '2px 8px',
  backgroundColor: COLORS.PRIMARY,
  color: '#ffffff',
  borderRadius: '4px',
  cursor: 'pointer',
  fontFamily: 'sans-serif',
};

export const PANEL_HEADER_STYLES = {
  height: '60px',
  padding: '0 16px',
  borderBottom: '1px solid #f0f0f0',
  display: 'flex',
  alignItems: 'center',
};

export const CENTERED_EMPTY_STATE_STYLES = {
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  textAlign: 'center',
};

export const SEARCH_INPUT_WRAPPER_STYLES = {
  height: '60px',
  padding: '0 12px',
  borderBottom: '1px solid #f0f0f0',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: COLORS.BACKGROUND_LIGHT,
};

export const BUTTON_PRIMARY_STYLES = {
  backgroundColor: COLORS.PRIMARY,
  color: '#FFFFFF',
  border: 'none',
  fontWeight: 600,
};

export const EMPTY_DATABASE_STYLES = {
  marginTop: '40px',
};
