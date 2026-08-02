import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { MockPractice } from '@/mocks/practice-data'

export function useGroupPractices(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'practices'],
    queryFn: () => apiClient<MockPractice[]>(`/groups/${groupId}/practices`),
  })
}

export function usePracticeDetail(groupId: string, practiceId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'practices', practiceId],
    queryFn: () =>
      apiClient<MockPractice>(`/groups/${groupId}/practices/${practiceId}`),
  })
}

interface CreatePracticeRequest {
  title: string
  startDate: string
  endDate: string
  problems: {
    provider: string
    externalProblemId: string
    name: string
    url?: string
  }[]
}

export function useCreatePractice(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePracticeRequest) =>
      apiClient<MockPractice>(`/groups/${groupId}/practices`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'practices'],
      })
    },
  })
}
