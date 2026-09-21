# Vendored skill — do not edit in place

| | |
|---|---|
| Upstream | https://github.com/anthropics/skills |
| Path | `skills/frontend-design` |
| Pinned at | `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f` (2026-09-03) |
| Vendored on | 2026-09-21 |
| License | see `LICENSE.txt` in this folder |

Local edits would be silently overwritten on the next update, and would make
the diff below unreadable. If this skill needs different behaviour for this
repo, write a separate skill next to it rather than editing these files.

## Updating

Fetch the current upstream copy and review the diff before committing:

```bash
curl -fsSL https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md -o .claude/skills/frontend-design/SKILL.md
```

Then update the pinned SHA above:

```bash
curl -fsSL "https://api.github.com/repos/anthropics/skills/commits?path=skills/frontend-design&per_page=1" | grep '"sha"' | head -1
```

## Scope

This skill is web design guidance — typography, color systems, hero and page
structure, HTML/CSS idioms. It does not know React Native, so treat its
implementation advice as inspiration rather than instruction when the target is
a `StyleSheet` in `src/`.
