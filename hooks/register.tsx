// usage-footer: subscription usage bars on the right side of the footer row,
// next to the permission-mode indicator ("⏵⏵ auto mode on ...").
//
// Data: the same 5-hour / 7-day windows the statusLine JSON carries, read from
// $.session.usage() at start and pushed by `session.measure` after each turn.
// Drawn by hooking `SessionMode`, the dim mode labels at the right of the footer.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'usage-footer', key: 'limits' } as const, [])
const now = atom({ plugin: 'usage-footer', key: 'now' } as const, 0)

const BAR_WIDTH = 10
const COMPACT_BELOW_COLUMNS = 110 // narrower terminals get "5h 24% · wk 84%"
const LABELS: Record<string, string> = { five_hour: '5h', seven_day: 'wk', spend_limit: 'spend' }
const ORDER = ['five_hour', 'seven_day', 'spend_limit']

const plain = (windows: readonly SessionRateLimit[]): Limit[] =>
  windows.map(({ kind, percentUsed, resetsAt }) =>
    resetsAt ? { kind, percentUsed, resetsAt } : { kind, percentUsed })

const color = (pct: number) => (pct >= 80 ? 'error' : pct >= 50 ? 'warning' : 'success')

const bar = (pct: number) => {
  const filled = Math.round((Math.min(Math.max(pct, 0), 100) / 100) * BAR_WIDTH)
  return '▓'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled)
}

// Time until a window resets, e.g. "2h14m" or "3d5h".
const until = (ms: number) => {
  const mins = Math.max(0, Math.round(ms / 60000))
  if (mins >= 1440) return `${Math.floor(mins / 1440)}d${Math.floor((mins % 1440) / 60)}h`
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60}m`
  return `${mins}m`
}

async function refresh($: EngineInterface, windows: readonly SessionRateLimit[]) {
  const t = await $.clock.now()
  await update($, limits, () => plain(windows))
  await update($, now, () => t)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($, (await $.session.usage()).rateLimits)
    // Keep the reset countdown current while the session is idle.
    $.clock.every(60_000, () => {
      void $.clock.now().then(t => update($, now, () => t))
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    await refresh($, e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const windows = await read($, limits)
    if (windows.length === 0) return next(e) // API key, or before the first response

    const t = await read($, now)
    const isCompact = (e.viewport?.columns ?? Infinity) < COMPACT_BELOW_COLUMNS
    const { Text } = $.ui.resolve(e)

    const parts = [...windows]
      .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
      .map(w => {
        const pct = w.percentUsed
        const reset = w.resetsAt && !isCompact ? ` ↻ ${until(Date.parse(w.resetsAt) - t)}` : ''
        return (
          <Text>
            <Text dimColor>{`${LABELS[w.kind] ?? w.kind} `}</Text>
            <Text color={color(pct)}>{`${isCompact ? '' : bar(pct) + ' '}${Math.round(pct)}%`}</Text>
            <Text dimColor>{reset}</Text>
          </Text>
        )
      })

    // Keep any mode labels the engine shows there (e.g. "focus").
    if (e.props.modes.length > 0) parts.unshift(<Text dimColor>{e.props.modes.join(' & ')}</Text>)

    return <Text>{parts.flatMap((p, i) => (i === 0 ? [p] : [<Text dimColor>{' · '}</Text>, p]))}</Text>
  })
}
