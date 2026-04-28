import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

export const dataProvider: any = {
  default: {
    getList: async ({ resource }: { resource: string }) => {
      const response = await api.get(`/${resource}`);
      return {
        data: response.data,
        total: response.data.length,
      };
    },

    getMany: async () => ({ data: [] }),

    getOne: async ({ resource, id }: { resource: string; id: string | number }) => {
      const response = await api.get(`/${resource}/${id}`);
      return {
        data: response.data,
      };
    },

    create: async ({ resource, variables, meta }: { resource: string; variables: any; meta?: any }) => {
      const name = meta?.name || variables?.name || '';
      const response = await api.put(`/${resource}/${encodeURIComponent(name)}`, variables);
      return {
        data: response.data,
      };
    },

    deleteOne: async ({ resource, id }: { resource: string; id: string | number }) => {
      await api.delete(`/${resource}/${id}`);
    },

    update: async () => ({ data: {} }),

    getApiUrl: () => '/api/v1',
  },
};
