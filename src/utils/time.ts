export const SNAP_GRID = 0.5

export function snapToGrid(time: number, grid: number = SNAP_GRID): number {
  return Math.round(time / grid) * grid
}

export function clampTime(time: number, min: number = 0, max: number = Infinity): number {
  return Math.max(min, Math.min(max, time))
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 2) return 0
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

export function getTimeProgress(current: number, total: number): number {
  return total > 0 ? (current / total) * 100 : 0
}
