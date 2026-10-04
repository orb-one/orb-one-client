import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface PracticeResponse {
  id?: string
  practiceId?: string
  title: string
  startDate?: string
  start_date?: string
  endDate?: string
  end_date?: string
  groupId?: string
  group_id?: string
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
  problems?: PracticeProblem[]
}

export interface PracticeProblem {
  problemId: string
  provider: string
  externalProblemId?: string
  external_problem_id?: string
  name: string
  url?: string
  difficulty?: string
}

export interface Practice {
  id: string
  title: string
  startDate: string
  endDate: string
  groupId: string
  createdAt: string
  updatedAt: string
  problems?: PracticeProblem[]
}

export function mapPractice(response: PracticeResponse): Practice {
  const practice: Practice = {
    id: response.practiceId ?? response.id ?? '',
    title: response.title,
    startDate: response.startDate ?? response.start_date ?? '',
    endDate: response.endDate ?? response.end_date ?? '',
    groupId: response.groupId ?? response.group_id ?? '',
    createdAt: response.createdAt ?? response.created_at ?? '',
    updatedAt: response.updatedAt ?? response.updated_at ?? '',
  }

  if (response.problems !== undefined) {
    practice.problems = response.problems.map((p) => {
      const prob: PracticeProblem = {
        problemId: p.problemId,
        provider: p.provider,
        externalProblemId: p.externalProblemId ?? p.external_problem_id ?? '',
        name: p.name,
      }
      if (p.url !== undefined) {
        prob.url = p.url
      }
      if (p.difficulty !== undefined) {
        prob.difficulty = p.difficulty
      }
      return prob
    })
  }

  return practice
}

export function useGroupPractices(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'practices'],
    queryFn: async () => {
      const response = await apiClient<PracticeResponse[]>(
        `/groups/${groupId}/practices`,
      )
      return response.map(mapPractice)
    },
  })
}

export function usePracticeDetail(groupId: string, practiceId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'practices', practiceId],
    queryFn: async () => {
      const response = await apiClient<PracticeResponse>(
        `/groups/${groupId}/practices/${practiceId}`,
      )
      return mapPractice(response)
    },
  })
}

interface CreatePracticeRequest {
  title: string
  startDate: string
  endDate: string
  problemIds: string[]
}

export function useCreatePractice(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePracticeRequest) => {
      // Map domain format to DTO before sending
      const payload = {
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
        problemIds: data.problemIds,
      }

      const response = await apiClient<PracticeResponse>(
        `/groups/${groupId}/practices`,
        {
          method: 'POST',
          body: payload,
        },
      )
      return mapPractice(response)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'practices'],
      })
    },
  })
}

export function useDeletePractice(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (practiceId: string) =>
      apiClient(`/groups/${groupId}/practices/${practiceId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'practices'],
      })
    },
  })
}

export interface UpdatePracticeRequest {
  title?: string
  startDate?: string
  endDate?: string
}

export function useUpdatePractice(groupId: string, practiceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdatePracticeRequest) => {
      const payload: Record<string, string> = {}
      if (data.title) payload.title = data.title
      if (data.startDate) payload.startDate = data.startDate
      if (data.endDate) payload.endDate = data.endDate

      const response = await apiClient<PracticeResponse>(
        `/groups/${groupId}/practices/${practiceId}`,
        {
          method: 'PUT',
          body: payload,
        },
      )
      return mapPractice(response)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'practices'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'practices', practiceId],
      })
    },
  })
}

export interface AddPracticeProblemRequest {
  problemIds: string[]
}

export function useAddPracticeProblem(groupId: string, practiceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AddPracticeProblemRequest) => {
      const payload = {
        problemIds: data.problemIds,
      }
      return apiClient(`/groups/${groupId}/practices/${practiceId}/problems`, {
        method: 'POST',
        body: payload,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'practices', practiceId],
      })
    },
  })
}

export function useRemovePracticeProblem(groupId: string, practiceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (problemId: string) => {
      return apiClient(
        `/groups/${groupId}/practices/${practiceId}/problems/${problemId}`,
        {
          method: 'DELETE',
        },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'practices', practiceId],
      })
    },
  })
}
