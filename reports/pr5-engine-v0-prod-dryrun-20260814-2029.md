(node:42290) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
# PR5 engine v0 batch recompute (dry-run)

**Environment**: production (ep-holy-cloud-ah6w4cml-pooler)
**Git SHA**: cc677abe75493f2e8bcc45a189e51a79a0d7fdbf
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


Wrote /Users/jaehanlee/thinkad-work/tkad-web/reports/pr5-engine-v0-prod-dryrun-2026081411295.md
npm notice
npm notice New minor version of npm available! 11.11.0 -> 11.19.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.19.0
npm notice To update run: npm install -g npm@11.19.0
npm notice
