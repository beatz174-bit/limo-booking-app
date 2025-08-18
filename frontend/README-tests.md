# Generated Vitest Unit Tests

This package contains unit tests for files detected in your `src/components`, `src/hooks`, and `src/lib` folders.

- Co-located tests created next to each target (same folder structure under `src/`).
- Uses `@testing-library/react` for component tests and `renderHook` from the same package for hook tests.
- Existing tests (like `NavBar.test.tsx`) are not overwritten.

## Install (if needed)

```bash
npm i -D vitest @testing-library/react @testing-library/user-event jsdom
```

Ensure your Vitest config uses the `jsdom` environment and that your TS path aliases (`@/*`) are resolved by Vite/Vitest.

## Notes

- `DevNotes.tsx` was skipped (file is empty).
- `usePriceCalculator` tests assert numerical output only (formula-based), not internal errors/messages.
- `ApiConfig` tests mock `@/api-client`, `@/services/tokenStore`, and `@/config` to verify correct wiring.
- `geocoding` tests mock `fetch` and assert backend vs. Nominatim fallback behavior.
