import { http, HttpResponse, passthrough } from 'msw'
import { mockPractices, type MockPractice } from './practice-data'

export const practiceHandlers = [
  // GET /groups/{groupId}/practices (Mocked because not in Swagger)
  http.get('*/groups/:groupId/practices', ({ params, request }) => {
    if (
      !isPracticeApiRequest(
        request,
        `/groups/${params.groupId as string}/practices`,
      )
    ) {
      return passthrough()
    }
    const { groupId } = params
    const groupPractices = mockPractices.filter((p) => p.groupId === groupId)
    return HttpResponse.json(groupPractices)
  }),

  // GET /groups/{groupId}/practices/{practiceId} (Mocked because not in Swagger)
  http.get('*/groups/:groupId/practices/:practiceId', ({ params, request }) => {
    if (
      !isPracticeApiRequest(
        request,
        `/groups/${params.groupId as string}/practices/${params.practiceId as string}`,
      )
    ) {
      return passthrough()
    }
    const { groupId, practiceId } = params
    const practice = mockPractices.find(
      (p) => p.groupId === groupId && p.practiceId === practiceId,
    )
    if (!practice) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json(practice)
  }),

  // POST /groups/{groupId}/practices
  http.post('*/groups/:groupId/practices', async ({ params, request }) => {
    if (
      !isPracticeApiRequest(
        request,
        `/groups/${params.groupId as string}/practices`,
      )
    ) {
      return passthrough()
    }
    const groupId = params.groupId as string
    const body = (await request.json()) as Partial<MockPractice>

    const newPractice: MockPractice = {
      practiceId: String(Date.now()),
      groupId,
      title: body.title ?? '새 연습',
      startDate: body.startDate ?? new Date().toISOString(),
      endDate: body.endDate ?? new Date(Date.now() + 86400000).toISOString(),
      problems: body.problems ?? [],
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockPractices.push(newPractice)
    return HttpResponse.json(newPractice, { status: 201 })
  }),
]

export function isPracticeApiRequest(request: Request, path: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) {
    return new URL(request.url).pathname === path
  }

  const expectedUrl = new URL(
    path.replace(/^\/+/, ''),
    baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
  )
  const requestUrl = new URL(request.url)

  return (
    requestUrl.origin === expectedUrl.origin &&
    requestUrl.pathname === expectedUrl.pathname
  )
}
