export function findNearestRegisteredParentPath(
  currentPath: string,
  registeredPaths: ReadonlySet<string>,
): string | null {
  const segments = currentPath.split('/').filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  // 등록되지 않은 중간 경로는 건너뜀
  while (segments.length > 1) {
    segments.pop()
    const candidate = `/${segments.join('/')}`

    if (registeredPaths.has(candidate)) {
      return candidate
    }
  }

  return registeredPaths.has('/') ? '/' : null
}
