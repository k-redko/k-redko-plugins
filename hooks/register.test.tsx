import { expect, test } from 'claude-code/testing'

const HOUR = 3_600_000
const T0 = Date.parse('2026-10-31T12:00:00Z')

const limitsAt = (t: number) => [
  { kind: 'seven_day', percentUsed: 84, resetsAt: new Date(t + 77 * HOUR).toISOString() },
  { kind: 'five_hour', percentUsed: 23.5, resetsAt: new Date(t + 2 * HOUR + 14 * 60_000).toISOString() },
]

const FOOTER = (columns: number, modes: string[] = []) => ({
  plugin: 'usage-footer',
  component: 'SessionMode',
  requestId: 'session-mode',
  surface: 'terminal',
  props: { modes },
  viewport: { columns, rows: 40 },
}) as const

function engine(on: Parameters<Parameters<typeof test>[1]>[1], rateLimits = limitsAt(T0)) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: T0, context: {}, rateLimits } }))
  on('clock.now', () => ({ value: T0 }))
  on('clock.every', () => ({ value: { cancel: () => {} } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
}

test('wide terminal: bars, percentages and reset countdowns, 5h first', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount(FOOTER(160))
  const all = (await ui.findAll({ type: 'Text' })).map(t => t.text).join('|')
  expect(all).toContain('▓▓░░░░░░░░ 24%')
  expect(all).toContain('▓▓▓▓▓▓▓▓░░ 84%')
  expect(all).toContain('↻ 2h14m')
  expect(all).toContain('↻ 3d5h')
  expect(all.indexOf('5h')).toBeLessThan(all.indexOf('wk'))
  await ui.unmount()
})

test('narrow terminal: percentages only, existing mode labels kept', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount(FOOTER(90, ['focus']))
  const all = (await ui.findAll({ type: 'Text' })).map(t => t.text).join('|')
  expect(all).toContain('focus')
  expect(all).toContain('24%')
  expect(all).not.toContain('▓')
  expect(all).not.toContain('↻')
  await ui.unmount()
})

test('no rate limits yet: the engine draws its own', async ($, on) => {
  engine(on, [])
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount(FOOTER(160))
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})
