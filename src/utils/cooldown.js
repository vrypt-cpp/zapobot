const buckets = new Map()
const SWEEP_INTERVAL_MS = 60_000

function sweep() {
  const now = Date.now()
  for (const [key, until] of buckets) {
    if (now >= until) buckets.delete(key)
  }
}

let sweeping = false

export function checkCooldown(key, seconds) {
  if (!seconds || seconds <= 0) return 0
  if (!sweeping) {
    sweeping = true
    setInterval(sweep, SWEEP_INTERVAL_MS).unref?.()
  }
  const now = Date.now()
  const until = buckets.get(key) || 0
  if (now < until) return Math.ceil((until - now) / 1000)
  buckets.set(key, now + seconds * 1000)
  return 0
}
