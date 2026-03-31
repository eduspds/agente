import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { User, Role, PaginatedResponse } from '../types/models';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: Role;
  password?: string;
}

/** API retorna array; normalizamos para o formato paginado esperado pela UI. */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/users');
      const list = Array.isArray(data) ? data : [];
      const wrapped: PaginatedResponse<User> = {
        data: list,
        pagination: {
          limit: 50,
          hasNextPage: false,
          nextCursor: null,
          total: list.length,
        },
      };
      return wrapped;
    },
    staleTime: 60_000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const { data } = await api.get<User>(`/users/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await api.post<User>('/users', {
        email: payload.email,
        password: payload.password,
        name: payload.name,
        role: payload.role,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateUserPayload;
    }) => {
      const body: Record<string, string | Role> = {};
      if (data.name !== undefined) body.name = data.name;
      if (data.email !== undefined) body.email = data.email;
      if (data.role !== undefined) body.role = data.role;
      if (data.password && data.password.length > 0) {
        body.password = data.password;
      }
      const { data: user } = await api.patch<User>(`/users/${id}`, body);
      return user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user', user.id], user);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
