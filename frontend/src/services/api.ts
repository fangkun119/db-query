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
  const response = await api.get<DatabaseSummary[]>('/databases');
  return response.data;
};

export const addDb = async (name: string, data: CreateConnectionRequest): Promise<DatabaseSummary> => {
  const response = await api.put<DatabaseSummary>(`/databases/${encodeURIComponent(name)}`, data);
  return response.data;
};

export const getDb = async (name: string): Promise<DatabaseDetail> => {
  const response = await api.get<DatabaseDetail>(`/databases/${encodeURIComponent(name)}`);
  return response.data;
};

export const deleteDb = async (name: string): Promise<void> => {
  await api.delete(`/databases/${encodeURIComponent(name)}`);
};

export const executeQuery = async (name: string, data: QueryRequest): Promise<QueryResult> => {
  const response = await api.post<QueryResult>(`/databases/${encodeURIComponent(name)}/query`, data);
  return response.data;
};

export const naturalQuery = async (name: string, data: NaturalQueryRequest): Promise<NLQueryResponse> => {
  const response = await api.post<NLQueryResponse>(`/databases/${encodeURIComponent(name)}/query/natural`, data);
  return response.data;
};

export default api;
