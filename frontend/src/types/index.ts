export interface ColumnMeta {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
}

export interface TableMeta {
  schemaName: string;
  tableName: string;
  tableType: string;
  columns: ColumnMeta[];
}

export interface DatabaseSummary {
  name: string;
  dbType: string;
  status: string;
  tableCount: number;
  viewCount: number;
  createdAt: string;
  lastRefreshedAt?: string;
}

export interface DatabaseDetail {
  name: string;
  dbType: string;
  status: string;
  tables: TableMeta[];
  createdAt: string;
  lastRefreshedAt?: string;
}

export interface QueryResult {
  columnNames: string[];
  rowData: Record<string, unknown>[];
  totalCount: number;
  isTruncated: boolean;
  executionTimeMs: number;
}

export interface QueryRequest {
  sql: string;
}

export interface NaturalQueryRequest {
  prompt: string;
}

export interface NLQueryResponse {
  sql: string;
  explanation?: string;
}

export interface CreateConnectionRequest {
  url: string;
}
