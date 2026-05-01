import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

interface CreateVariables {
  name?: string;
  url?: string;
}

interface CreateMeta {
  name?: string;
}

interface CreateParams {
  resource: string;
  variables: CreateVariables;
  meta?: CreateMeta;
}

interface DataProviderMethods {
  getList: ({ resource }: { resource: string }) => Promise<{ data: unknown[]; total: number }>;
  getOne: ({ resource, id }: { resource: string; id: string | number }) => Promise<{ data: unknown }>;
  create: (params: CreateParams) => Promise<{ data: unknown }>;
  deleteOne: ({ resource, id }: { resource: string; id: string | number }) => Promise<void>;
}

interface DataProvider {
  default: DataProviderMethods;
}

export const dataProvider: DataProvider = {
  default: {
    getList: async ({ resource }: { resource: string }) => {
      const response = await api.get(`/${resource}`);
      return {
        data: response.data,
        total: response.data.length,
      };
    },

    getOne: async ({ resource, id }: { resource: string; id: string | number }) => {
      const response = await api.get(`/${resource}/${id}`);
      return {
        data: response.data,
      };
    },

    create: async ({ resource, variables, meta }: CreateParams) => {
      const name = meta?.name || variables?.name || '';
      const response = await api.put(`/${resource}/${encodeURIComponent(name)}`, variables);
      return {
        data: response.data,
      };
    },

    deleteOne: async ({ resource, id }: { resource: string; id: string | number }) => {
      await api.delete(`/${resource}/${id}`);
    },
  },
};
