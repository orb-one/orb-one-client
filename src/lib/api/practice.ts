import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface PracticeResponse {
  id: string
  title: string
  start_date: string
  end_date: string
  group_id: string
  created_at: string
  updated_at: string
  problems?: PracticeProblem[]
}

export interface PracticeProblem {
  problemId: string
  provider: string
  externalProblemId: string
  name: string
  url?: string
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
    id: response.id,
    title: response.title,
    startDate: response.start_date,
    endDate: response.end_date,
    groupId: response.group_id,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  }

  if (response.problems !== undefined) {
    practice.problems = response.problems
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

interface CreatePracticeProblem {
  provider: string
  externalProblemId: string
  name: string
  url?: string
}

interface CreatePracticeRequest {
  title: string
  startDate: string
  endDate: string
  problems: CreatePracticeProblem[]
}

export function useCreatePractice(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePracticeRequest) => {
      // Map domain format to DTO before sending
      const payload = {
        title: data.title,
        startDate: `${data.startDate}T00:00:00`,
        endDate: `${data.endDate}T23:59:59`,
        problems: data.problems.map((p) => ({
          provider: p.provider,
          externalProblemId: p.externalProblemId,
          name: p.name,
          url: p.url,
        })),
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
      if (data.startDate) payload.startDate = `${data.startDate}T00:00:00`
      if (data.endDate) payload.endDate = `${data.endDate}T23:59:59`

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
  provider: string
  externalProblemId: string
  name: string
  url?: string
}

export function useAddPracticeProblem(groupId: string, practiceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AddPracticeProblemRequest) => {
      const payload = {
        provider: data.provider,
        externalProblemId: data.externalProblemId,
        name: data.name,
        url: data.url,
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
