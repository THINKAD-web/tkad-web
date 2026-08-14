(node:13220) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
# PR5 engine v0 batch recompute (dry-run)

**Environment**: preview (ep-shiny-sun-ahrk7gkk-pooler)
**Git SHA**: 8d380be4d77c910ad3b00b04c4f20db8b471d5fc
**Scope**: model_version=legacy-migration-v1
**Engine**: v0-fallback

## Summary

| Metric | Count |
|--------|------:|
| Planned | 821 |
| Processed | 821 |
| modelVersion promotion | 821 |
| Value changes (should be 0 for v0) | 0 |
| Skipped | 0 |
| Failures | 0 |


Wrote /Users/jaehanlee/thinkad-work/tkad-web/reports/pr5-engine-v0-preview-dryrun-2026081411114.md
