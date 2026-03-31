import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type AiProvider = 'google' | 'openai' | 'anthropic' | 'custom';

export interface AiProviderConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl?: string;
}

export interface AiModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
  cacheTtlSeconds: number;
}

export interface AiPromptConfig {
  systemPrompt: string;
  promptVersion: number;
  truncateMaxMessages: number;
  truncateMaxChars: number;
}

export interface AiTriggerConfig {
  qualificationKeywords: string[];
  disqualificationKeywords: string[];
  debounceMinutes: number;
  confidenceThreshold: number;
  requiredFields: string[];
}

export interface AiConfig {
  id: string;
  provider: AiProviderConfig;
  model: AiModelConfig;
  prompt: AiPromptConfig;
  triggers: AiTriggerConfig;
  isActive: boolean;
  updatedAt: string;
}

export type AiConfigDraft = Omit<
  AiConfig,
  'id' | 'isActive' | 'updatedAt'
>;

export interface TestConnectionResult {
  success: boolean;
  latencyMs: number | null;
  model: string | null;
  error: string | null;
}

export function useAiConfig() {
  return useQuery({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const { data } = await api.get<AiConfig>('/settings/ai');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useSaveAiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: AiConfigDraft) => {
      const { data } = await api.put<AiConfig>('/settings/ai', config);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-config'], data);
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useTestAiConnection() {
  return useMutation({
    mutationFn: async (providerConfig: AiProviderConfig & { model: string }) => {
      const { data } = await api.post<TestConnectionResult>(
        '/settings/ai/test',
        providerConfig,
      );
      return data;
    },
  });
}
