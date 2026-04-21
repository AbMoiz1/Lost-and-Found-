// Feature: lost-and-found-app, Property 8, Property 9
import * as fc from 'fast-check';
import request from 'supertest';
import express from 'express';

// ── Mock OpenSearch before importing the router ───────────────────────────────

const mockSearch = jest.fn();
jest.mock('./opensearch', () => ({
  opensearchClient: {
    search: mockSearch,
  },
  INDEX_NAME: 'items',
  ensureIndex: jest.fn(),
}));

import searchRouter from './routes/search';

const app = express();
app.use(express.json());
app.use('/api/search', searchRouter);

// ── Arbitraries ───────────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'Electronics', 'Clothing', 'Accessories', 'Documents',
  'Keys', 'Pets', 'Bags', 'Wallets', 'Jewelry', 'Other',
] as const;

const categoryArb = fc.constantFrom(...VALID_CATEGORIES);

const locationArb = fc
  .string({ minLength: 1, maxLength: 60 })
  .filter(s => s.trim().length > 0 && !s.includes('&') && !s.includes('='));

const dateStringArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map(d => d.toISOString().slice(0, 10));

const itemTypeArb = fc.constantFrom('lost', 'found');

/**
 * Generates an arbitrary set of optional search filters.
 * Each filter is independently present or absent.
 */
const filtersArb = fc.record(
  {
    category: fc.option(categoryArb, { nil: undefined }),
    location: fc.option(locationArb, { nil: undefined }),
    from:     fc.option(dateStringArb, { nil: undefined }),
    to:       fc.option(dateStringArb, { nil: undefined }),
    type:     fc.option(itemTypeArb, { nil: undefined }),
    q:        fc.option(
      fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0),
      { nil: undefined },
    ),
  },
  { requiredKeys: [] },
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildQueryString(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function mockEmptyResult(): void {
  mockSearch.mockResolvedValueOnce({
    body: { hits: { hits: [] } },
  });
}

// ── Property 8: Search filter conjunction ────────────────────────────────────
/**
 * For any combination of active filters (category, location, date range, type),
 * the OpenSearch query built by the route must contain the correct filter
 * clauses for ALL active filters simultaneously.
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5
 */
describe('Property 8: Search filter conjunction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('query contains all active filter clauses simultaneously', async () => {
    await fc.assert(
      fc.asyncProperty(filtersArb, async (filters) => {
        jest.clearAllMocks();
        mockEmptyResult();

        const qs = buildQueryString(filters as Record<string, string | undefined>);
        const res = await request(app).get(`/api/search/items${qs}`);

        expect(res.status).toBe(200);

        const callBody = mockSearch.mock.calls[0][0].body;
        const filterClauses: object[] = callBody.query.bool.filter;
        const mustClauses: object[] = callBody.query.bool.must;

        // ── category filter ──────────────────────────────────────────────────
        if (filters.category !== undefined) {
          const hasCategoryFilter = filterClauses.some(
            (f: { term?: { category?: string } }) => f.term?.category === filters.category,
          );
          expect(hasCategoryFilter).toBe(true);
        }

        // ── location filter ──────────────────────────────────────────────────
        if (filters.location !== undefined) {
          const hasLocationFilter = filterClauses.some(
            (f: { match?: { location?: string } }) => f.match?.location === filters.location,
          );
          expect(hasLocationFilter).toBe(true);
        }

        // ── date range filter ────────────────────────────────────────────────
        if (filters.from !== undefined || filters.to !== undefined) {
          const rangeFilter = filterClauses.find(
            (f: { range?: { date?: object } }) => f.range?.date !== undefined,
          ) as { range: { date: Record<string, string> } } | undefined;

          expect(rangeFilter).toBeDefined();

          if (filters.from !== undefined) {
            expect(rangeFilter!.range.date.gte).toBe(filters.from);
          }
          if (filters.to !== undefined) {
            expect(rangeFilter!.range.date.lte).toBe(filters.to);
          }
        }

        // ── type filter ──────────────────────────────────────────────────────
        if (filters.type !== undefined) {
          const hasTypeFilter = filterClauses.some(
            (f: { term?: { type?: string } }) => f.term?.type === filters.type,
          );
          expect(hasTypeFilter).toBe(true);
        }

        // ── full-text query ──────────────────────────────────────────────────
        if (filters.q !== undefined) {
          const hasMultiMatch = mustClauses.some(
            (c: { multi_match?: { query?: string } }) => c.multi_match?.query === filters.q,
          );
          expect(hasMultiMatch).toBe(true);
        } else {
          // No q → must use match_all
          const hasMatchAll = mustClauses.some(
            (c: { match_all?: object }) => c.match_all !== undefined,
          );
          expect(hasMatchAll).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 9: Search returns only active items ──────────────────────────────
/**
 * For any search query, the OpenSearch query ALWAYS includes must_not clauses
 * for status=deleted and status=claimed, regardless of what other filters are
 * applied.
 * Validates: Requirements 4.1, 7.6
 */
describe('Property 9: Search returns only active items', () => {
  beforeEach(() => jest.clearAllMocks());

  it('query always excludes deleted and claimed statuses', async () => {
    await fc.assert(
      fc.asyncProperty(filtersArb, async (filters) => {
        jest.clearAllMocks();
        mockEmptyResult();

        const qs = buildQueryString(filters as Record<string, string | undefined>);
        const res = await request(app).get(`/api/search/items${qs}`);

        expect(res.status).toBe(200);

        const callBody = mockSearch.mock.calls[0][0].body;
        const filterClauses: object[] = callBody.query.bool.filter;

        // There must be a bool.must_not clause excluding deleted and claimed
        const statusExclusionFilter = filterClauses.find(
          (f: { bool?: { must_not?: object[] } }) => Array.isArray(f.bool?.must_not),
        ) as { bool: { must_not: object[] } } | undefined;

        expect(statusExclusionFilter).toBeDefined();

        const mustNot = statusExclusionFilter!.bool.must_not;
        expect(mustNot).toContainEqual({ term: { status: 'deleted' } });
        expect(mustNot).toContainEqual({ term: { status: 'claimed' } });
      }),
      { numRuns: 100 },
    );
  });
});
