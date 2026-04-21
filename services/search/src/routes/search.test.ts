import request from 'supertest';
import express from 'express';

// Mock the opensearch module before importing the router
const mockSearch = jest.fn();
jest.mock('../opensearch', () => ({
  opensearchClient: {
    search: mockSearch,
  },
  INDEX_NAME: 'items',
  ensureIndex: jest.fn(),
}));

import searchRouter from './search';

const app = express();
app.use(express.json());
app.use('/api/search', searchRouter);

const makeHit = (source: object) => ({ _source: source });

const activeItem = (overrides: object = {}) => ({
  id: 'item-1',
  type: 'lost',
  title: 'Blue Wallet',
  description: 'A blue leather wallet',
  category: 'Wallets',
  location: 'Central Park',
  date: '2024-01-15',
  status: 'active',
  ownerId: 'user-1',
  ...overrides,
});

function mockSearchResult(items: object[]) {
  mockSearch.mockResolvedValueOnce({
    body: {
      hits: {
        hits: items.map(makeHit),
      },
    },
  });
}

describe('GET /api/search/items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with empty array when no results', async () => {
    mockSearchResult([]);
    const res = await request(app).get('/api/search/items');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns items from OpenSearch hits', async () => {
    const item = activeItem();
    mockSearchResult([item]);
    const res = await request(app).get('/api/search/items');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'item-1', title: 'Blue Wallet' });
  });

  it('includes must_not filter for deleted and claimed statuses', async () => {
    mockSearchResult([]);
    await request(app).get('/api/search/items');

    const callBody = mockSearch.mock.calls[0][0].body;
    const filterClauses = callBody.query.bool.filter;
    const statusFilter = filterClauses.find(
      (f: { bool?: { must_not?: object[] } }) => f.bool?.must_not
    );
    expect(statusFilter).toBeDefined();
    expect(statusFilter.bool.must_not).toContainEqual({ term: { status: 'deleted' } });
    expect(statusFilter.bool.must_not).toContainEqual({ term: { status: 'claimed' } });
  });

  it('adds multi_match clause when q param is provided', async () => {
    mockSearchResult([]);
    await request(app).get('/api/search/items?q=wallet');

    const callBody = mockSearch.mock.calls[0][0].body;
    const mustClauses = callBody.query.bool.must;
    const multiMatch = mustClauses.find((c: { multi_match?: object }) => c.multi_match);
    expect(multiMatch).toBeDefined();
    expect(multiMatch.multi_match.query).toBe('wallet');
    expect(multiMatch.multi_match.fields).toContain('title');
    expect(multiMatch.multi_match.fields).toContain('description');
  });

  it('adds term filter for category when provided', async () => {
    mockSearchResult([]);
    await request(app).get('/api/search/items?category=Wallets');

    const callBody = mockSearch.mock.calls[0][0].body;
    const filterClauses = callBody.query.bool.filter;
    expect(filterClauses).toContainEqual({ term: { category: 'Wallets' } });
  });

  it('adds match filter for location when provided', async () => {
    mockSearchResult([]);
    await request(app).get('/api/search/items?location=Central+Park');

    const callBody = mockSearch.mock.calls[0][0].body;
    const filterClauses = callBody.query.bool.filter;
    expect(filterClauses).toContainEqual({ match: { location: 'Central Park' } });
  });

  it('adds date range filter when from and to are provided', async () => {
    mockSearchResult([]);
    await request(app).get('/api/search/items?from=2024-01-01&to=2024-12-31');

    const callBody = mockSearch.mock.calls[0][0].body;
    const filterClauses = callBody.query.bool.filter;
    const rangeFilter = filterClauses.find(
      (f: { range?: object }) => f.range
    );
    expect(rangeFilter).toBeDefined();
    expect(rangeFilter.range.date).toEqual({ gte: '2024-01-01', lte: '2024-12-31' });
  });

  it('adds date range filter with only from', async () => {
    mockSearchResult([]);
    await request(app).get('/api/search/items?from=2024-06-01');

    const callBody = mockSearch.mock.calls[0][0].body;
    const filterClauses = callBody.query.bool.filter;
    const rangeFilter = filterClauses.find((f: { range?: object }) => f.range);
    expect(rangeFilter.range.date).toEqual({ gte: '2024-06-01' });
  });

  it('adds term filter for type when provided', async () => {
    mockSearchResult([]);
    await request(app).get('/api/search/items?type=lost');

    const callBody = mockSearch.mock.calls[0][0].body;
    const filterClauses = callBody.query.bool.filter;
    expect(filterClauses).toContainEqual({ term: { type: 'lost' } });
  });

  it('combines multiple filters simultaneously', async () => {
    mockSearchResult([]);
    await request(app).get('/api/search/items?q=wallet&category=Wallets&type=lost');

    const callBody = mockSearch.mock.calls[0][0].body;
    const { must, filter } = callBody.query.bool;

    const hasMultiMatch = must.some((c: { multi_match?: object }) => c.multi_match);
    const hasCategoryFilter = filter.some(
      (f: { term?: { category?: string } }) => f.term?.category === 'Wallets'
    );
    const hasTypeFilter = filter.some(
      (f: { term?: { type?: string } }) => f.term?.type === 'lost'
    );

    expect(hasMultiMatch).toBe(true);
    expect(hasCategoryFilter).toBe(true);
    expect(hasTypeFilter).toBe(true);
  });

  it('uses match_all when no q param is provided', async () => {
    mockSearchResult([]);
    await request(app).get('/api/search/items?category=Keys');

    const callBody = mockSearch.mock.calls[0][0].body;
    const mustClauses = callBody.query.bool.must;
    expect(mustClauses).toContainEqual({ match_all: {} });
  });

  it('returns 500 when OpenSearch throws', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app).get('/api/search/items');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'SEARCH_ERROR' });
  });
});
