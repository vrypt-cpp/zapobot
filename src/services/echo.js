const seen = new Map()
const TTL_MS = 60_000
const MAX_TRACKED = 1000

export function markEcho(id) {
  if (!id) return
  seen.set(id, Date.now() + TTL_MS)
  while (seen.size > MAX_TRACKED) {
    seen.delete(seen.keys().next().value)
  }
}

export function isEcho(id) {
  if (!id) return false
  const until = seen.get(id)
  if (!until) return false
  if (Date.now() >= until) {
    seen.delete(id)
    return false
  }
  return true
}
