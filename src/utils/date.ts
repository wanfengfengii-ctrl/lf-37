export function isOverdue(deadline?: string): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateVersionLabel(
  index: number,
  now: Date = new Date()
): string {
  const ts = now.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `版本 ${index + 1} - ${ts}`
}
