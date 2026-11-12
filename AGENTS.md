# AGENTS.md

Instructions for AI coding agents (Codex, Claude Code, Cursor and others) using or editing this repository.

## What this is
SEO and AI visibility skills backed by a zero-dependency Node CLI (`cli/`). Each skill in `skills/<name>/SKILL.md` tells an agent when to act, which CLI commands to run, how to read the output and what never to do. Sources for every factual claim live in `skills/<name>/references/`.

## Using the skills
- Claude Code: install as a plugin (`/plugin marketplace add sitetiller/seo-skills`, then install `sitetiller-seo`), or copy `skills/*` into `.claude/skills/`.
- Codex and other agents: read the relevant `skills/<name>/SKILL.md` before acting on an SEO or AI visibility task. Skills install to `.agents/skills/` under the Agent Skills convention.
- CLI: `npx sitetiller <command> --json` (Node 18.17+). From a clone: `node cli/bin/sitetiller.mjs <command>`.

## Skill index
| Skill | Use it for |
|---|---|
| ai-crawlers | Which search and AI crawlers can reach a site; robots.txt policy and tests |
| ai-logs | Real AI bot visits in server logs, verified against published IP ranges; AI referral visits |
| gsc-bing | Google Search Console and Bing Webmaster data side by side |
| measure-rollback | Version pages you own, measure changes against controls, roll back losers |

(More skills are listed in README.md as they are added.)

## Rules for agents
1. **Read-only by default.** Checks fetch public pages only. Data connectors use read-only scopes. Never request write scopes unless a skill explicitly needs them and the user agreed.
2. **Own pages only.** Do not edit pages the user did not ask about. Rollbacks and publishing apply only to pages the user owns and named.
3. **No invented facts.** Every number in a report comes from a command output or a cited source. If unsure, say so.
4. **Secrets** go in environment variables or a gitignored `.env`, never in chat, code, commits or reports.
5. **Be polite to servers.** The CLI fetches one URL at a time with delays; do not parallelise crawls.

## Developing
- Tests: `node --test tests/*.test.mjs` (offline, no network).
- Skill format check: `node scripts/validate-skills.mjs` (frontmatter, length, references, Guardrails section, real CLI commands only).
- New skill: copy an existing one, keep SKILL.md under 500 lines, put sources with access dates in `references/sources.md`.
- License: MIT. Code or text copied from another project must be MIT/Apache/BSD/CC-BY and recorded in `THIRD_PARTY_NOTICES.md`.
