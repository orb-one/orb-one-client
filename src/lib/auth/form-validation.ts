export function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === 'string' ? value : ''
}

// Spring @Email과 완전 동일한 파서는 아니며 명백한 형식 오류의 1차 필터
export function isEmailFormat(value: string) {
  return /^[\w.!#$%&'*+/=?^`{|}~-]+@[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)*$/i.test(
    value,
  )
}
