# Portainer MCP - Project Guidelines

## Versioning

This project uses **semantic versioning** (`MAJOR.MINOR.PATCH`):

- **PATCH** (`0.0.x`): Auto-incremented on every push to `main`
- **MINOR** (`0.x.0`): Bumped manually for new features or significant changes
- **MAJOR** (`x.0.0`): Reserved for breaking changes (not expected while in 0.x)

Currently in `0.0.x` pre-release phase - API may change without notice.

### Docker Image Tags

| Tag | Description |
|-----|-------------|
| `latest` | Always points to the most recent build |
| `0.0.x` | Specific version (auto-incremented) |
| `main` | Latest commit on main branch |
| `<sha>` | Specific commit |

## Commits

This project uses **conventional commits**:

```
feat: add new feature
fix: bug fix
docs: documentation only
test: adding tests
refactor: code restructure without behavior change
chore: maintenance tasks
ci: CI/CD changes
perf: performance improvements
```

Examples:
- `feat: add container_stats tool`
- `fix: handle missing env vars in stack response`
- `docs: update README with new tools`

## Code Style

- TypeScript with strict mode
- Zod for runtime validation
- Keep tools focused and single-purpose
- All write operations require `PORTAINER_WRITE_ENABLED=true`
