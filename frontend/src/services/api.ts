import axios from 'axios';
import type {
  DatabaseSummary,
  DatabaseDetail,
  QueryResult,
  NLQueryResponse,
  QueryRequest,
  NaturalQueryRequest,
  CreateConnectionRequest,
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const listDbs = async (): Promise<DatabaseSummary[]> => {
  const response = await api.get<DatabaseSummary[]>('/dbs');
  return response.data;
};

export const addDb = async (name: string, data: CreateConnectionRequest): Promise<DatabaseSummary> => {
  const response = await api.put<DatabaseSummary>(`/dbs/${encodeURIComponent(name)}`, data);
  return response.data;
};

export const getDb = async (name: string): Promise<DatabaseDetail> => {
  const response = await api.get<DatabaseDetail>(`/dbs/${encodeURIComponent(name)}`);
  return response.data;
};

export const deleteDb = async (name: string): Promise<void> => {
  await api.delete(`/dbs/${encodeURIComponent(name)}`);
};

export const refreshDb = async (name: string): Promise<DatabaseDetail> => {
  const response = await api.post<DatabaseDetail>(`/dbs/${encodeURIComponent(name)}/refresh`);
  return response.data;
};

export const executeQuery = async (name: string, data: QueryRequest): Promise<QueryResult> => {
  const response = await api.post<QueryResult>(`/dbs/${encodeURIComponent(name)}/query`, data);
  return response.data;
};

export const naturalQuery = async (name: string, data: NaturalQueryRequest): Promise<NLQueryResponse> => {
  const response = await api.post<NLQueryResponse>(`/dbs/${encodeURIComponent(name)}/query/natural`, data);
  return response.data;
};

export default api;
