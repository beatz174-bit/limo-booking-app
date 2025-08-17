// src/test/server.ts
import { setupServer } from 'msw/node';
import { handlers } from '../msw/handlers';

export const server = setupServer(...handlers);

// In tests, keep strict mode so missing mocks fail loudly
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
