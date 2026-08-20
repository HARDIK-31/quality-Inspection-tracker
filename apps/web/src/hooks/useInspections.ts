import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { CreateInspectionInput, InspectionFilters } from '../lib/types';

export const inspectionKeys = {
  all: ['inspections'] as const,
  list: (filters: InspectionFilters) => ['inspections', 'list', filters] as const,
  detail: (id: string) => ['inspections', 'detail', id] as const,
  summary: ['inspections', 'summary'] as const,
};

export function useInspectionList(filters: InspectionFilters) {
  return useQuery({
    queryKey: inspectionKeys.list(filters),
    queryFn: () => api.listInspections(filters),
    placeholderData: (previous) => previous, // no flash of empty list while filtering
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: inspectionKeys.detail(id),
    queryFn: () => api.getInspection(id),
    enabled: Boolean(id),
  });
}

export function useSummary() {
  return useQuery({ queryKey: inspectionKeys.summary, queryFn: api.getSummary });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInspectionInput) => api.createInspection(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
}

export function useResolveInspection(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resolutionNote: string) => api.resolveInspection(id, resolutionNote),
    onSuccess: (updated) => {
      queryClient.setQueryData(inspectionKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
    },
  });
}
