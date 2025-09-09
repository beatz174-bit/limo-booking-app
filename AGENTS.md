# AGENTS Guidelines

These instructions apply to the entire repository.

## Environment

- **Python:** 3.11+
- **Node.js:** 18+

## Code Style

Be sure to follow all relevant best practices and industry conventions.

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
and lint output to log files and view the tail for context. The backend
tests use `pytest -q --maxfail=1 --disable-warnings` to stop on the first
failure and suppress warnings, keeping logs small and preventing the
session from hanging. Be sure to keep all tests to the bare minimum. 
Only run the tests that you need to run for the changes you have made.
When running "npm test" ensure that you run targeted tests. Don't run all 
the frontend tests, only the tests you need to.

```bash
npm run lint 2>&1 | tee /tmp/lint.log | tail -n 200
cd backend && pytest -q --maxfail=1 --disable-warnings >/tmp/backend.log 2>&1; tail -n 200 /tmp/backend.log
cd ../frontend && npx vitest run >/tmp/frontend.log 2>&1; tail -n 200 /tmp/frontend.log
```

### Selective Test Runs

- Run only unit tests with `pytest tests/unit`.
- Filter tests using patterns via `pytest -k <pattern>`.
- Integration and end-to-end tests may be skipped by default.
- Tests may be omitted entirely when the user explicitly states they will run them locally.

## Commit Messages

- Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
- Keep messages concise and descriptive.

## Pull Requests

- Summarize changes clearly.
- Mention relevant tests and linters executed.
