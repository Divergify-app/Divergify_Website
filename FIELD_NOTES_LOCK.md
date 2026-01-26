# Field Notes Lock

Field Notes content is treated as immutable by default.

- Lock check: `scripts/lock-field-notes.sh`
- Unlock for edits: run with `FIELD_NOTES_UNLOCK=1`

Example:

```
FIELD_NOTES_UNLOCK=1 ./scripts/lock-field-notes.sh
```

Local guardrails:
- This repo uses a pre-commit hook to enforce the lock.
- If needed, re-enable via: `git config core.hooksPath scripts/githooks`
