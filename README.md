# claude-statusline

A small [Claude Code](https://code.claude.com) plugin that shows your subscription usage — the 5-hour session limit and the weekly limit — as progress bars on the right side of the footer, on the same row as the permission-mode indicator. No extra status line row, no dependencies, about 90 lines of code.

## How it looks

Wide terminal (110+ columns): bar, percentage, and time until the window resets.

```
⏵⏵ auto mode on (shift+tab to cycle)          5h ▓▓░░░░░░░░ 24% ↻ 2h14m · wk ▓▓▓▓▓▓▓▓░░ 84% ↻ 3d5h
```

Narrow terminal: percentages only.

```
⏵⏵ auto mode on (shift+tab to cycle)   5h 24% · wk 84%
```

Bars are green below 50%, yellow from 50%, and red from 80%, using your Claude Code theme's colors. Behind a Claude apps gateway with a spend limit, a `spend` bar is added.

## Install

In a Claude Code session:

```
/plugin install usage-footer --marketplace k-redko/claude-statusline
```

Answer `y` to add the marketplace, pick the user scope, and it's active. Or from a shell:

```
claude plugin install usage-footer --marketplace k-redko/claude-statusline
```

## Requirements

- A claude.ai **Pro, Max, or Ultra** subscription. Usage limits don't exist for API-key users, so nothing is shown.
- Claude Code **2.1.316** or later (built and tested on 2.1.316). The plugin hooks API it uses is marked early access and may change between releases.

The bars appear after the first response in a session; until then the footer looks as usual.

## How it works

`hooks/register.tsx` reads the rate-limit windows from `$.session.usage()` when the session starts, updates them on every `session.measure` event (after each turn), and redraws the footer's `SessionMode` slot — the dim labels at the right of the mode row — with the bars. Any labels Claude Code would show there (like `focus`) are kept in front. A one-minute timer keeps the reset countdowns current while the session is idle.

To tweak it, edit the constants at the top of `hooks/register.tsx` (bar width, the 110-column compact threshold, labels). Run the tests with:

```
claude plugin test .
```

## Uninstall

```
/plugin uninstall usage-footer
```

## License

[MIT](LICENSE)
