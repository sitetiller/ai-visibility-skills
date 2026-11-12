# Prompt types for a tracking set

These seven types are a working taxonomy for covering how a buyer might ask. It is this repo's own checklist, not a vendor-published classification. Bing's Intents (Informational, Commercial, Navigational, Learn and Solve, Research, Creation, Local) is a Microsoft classification of grounding queries; use it as a cross-check, not as this list.

Write prompts the way real people ask. Take wording from Search Console queries, support tickets, sales calls the user already has, and forum threads. Do not invent volume. Keep the set fixed once weekly runs start; changing a prompt breaks the comparison with earlier weeks, so add new prompts under a new label instead.

| Type | What the person wants | Example (project-management tool "Acme") | What a mention or citation means |
|---|---|---|---|
| discovery | Names in a category | "What are good project management tools for small agencies?" | The brand is in the consideration set |
| problem | A fix for a pain, no product named | "How do I stop missing client deadlines across 10 projects?" | The brand is tied to the problem |
| price | Cost and plans | "How much does Acme cost per user?" and "cheapest project tools for 5 people" | Answers carry the right price (check it) |
| comparison | A against B | "Acme vs Asana for a 10-person agency" | The brand is described fairly and correctly |
| alternatives | Substitutes for a named product | "Alternatives to Asana with client portals" | The brand appears next to the named product |
| trust | Safety, reliability, reviews | "Is Acme legit?" and "Acme data security" | What claims the answer repeats, and from which source |
| brand | Direct questions about the brand | "What is Acme?" and "Who makes Acme?" | Baseline: is the description accurate and current |

## Set size and balance
- 5 to 10 prompts per type covers most categories; 35 to 70 prompts total. Cost grows with prompts x engines x runs (see SKILL.md).
- Brand prompts name the brand, so a mention is expected. Report them apart from the other six types; mixing them inflates the overall mention rate.
- Put the user's own competitors in `--competitors`. Check each answer's wording by hand for 10 or so answers before trusting the counts.

## File format for `--prompts`
One prompt per line. Blank lines and lines starting with `#` are ignored. Use `#` lines to mark the type, and keep one file per type if you want separate rates, because the log does not record the type.

```
# discovery
What are good project management tools for small agencies?
Best project management software for a 10-person team
# comparison
Acme vs Asana for a small agency
```
