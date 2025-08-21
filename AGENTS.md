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

```bash
npm run lint           # frontend lint
cd backend && pytest   # backend tests
cd ../frontend && npm test  # frontend unit tests
```

## Commit Messages

- Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
- Keep messages concise and descriptive.

## Pull Requests

- Summarize changes clearly.
- Mention relevant tests and linters executed.
