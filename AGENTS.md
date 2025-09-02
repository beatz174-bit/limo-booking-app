# AGENTS Guidelines

These instructions apply to the entire repository.

## Environment

- **Python:** 3.11+
- **Node.js:** 18+

## Code Style

### Backend (Python)
- Format code with `black` and sort imports with `isort`.
- Keep lines at or below 88 characters.
- Use `snake_case` for functions and variables.
- Prefer type hints and dataclasses when appropriate.

### Frontend (TypeScript/React)
- Follow the existing ESLint configuration.
- Use functional components and React hooks.
- Use `camelCase` for variables and `PascalCase` for components.

## Linting & Tests

Run the following before committing:

To prevent excessive console output from hanging sessions, redirect test
and lint output to log files and view the tail for context.

```bash
npm run lint 2>&1 | tee /tmp/lint.log | tail -n 200
cd backend && pytest >/tmp/backend.log 2>&1; tail -n 200 /tmp/backend.log
cd ../frontend && npm test >/tmp/frontend.log 2>&1; tail -n 200 /tmp/frontend.log
```

## Commit Messages

- Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
- Keep messages concise and descriptive.

## Pull Requests

- Summarize changes clearly.
- Mention relevant tests and linters executed.
