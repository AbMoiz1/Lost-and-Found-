import { Router, Request, Response } from 'express';
import { opensearchClient, INDEX_NAME } from '../opensearch';

const router = Router();

// GET /api/search/items
router.get('/items', async (req: Request, res: Response) => {
  try {
    const { q, category, location, from, to, type } = req.query as Record<string, string | undefined>;

    const mustClauses: object[] = [];
    const filterClauses: object[] = [];

    // Always exclude deleted and claimed items
    filterClauses.push({
      bool: {
        must_not: [
          { term: { status: 'deleted' } },
          { term: { status: 'claimed' } },
        ],
      },
    });

    // Full-text search on title and description
    if (q) {
      mustClauses.push({
        multi_match: {
          query: q,
          fields: ['title', 'description'],
        },
      });
    }

    // Category filter
    if (category) {
      filterClauses.push({ term: { category } });
    }

    // Location filter
    if (location) {
      filterClauses.push({ match: { location } });
    }

    // Date range filter
    if (from || to) {
      const range: Record<string, string> = {};
      if (from) range['gte'] = from;
      if (to) range['lte'] = to;
      filterClauses.push({ range: { date: range } });
    }

    // Type filter (lost/found)
    if (type) {
      filterClauses.push({ term: { type } });
    }

    const query = {
      bool: {
        must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
        filter: filterClauses,
      },
    };

    const response = await opensearchClient.search({
      index: INDEX_NAME,
      body: { query },
    });

    const hits = response.body.hits?.hits ?? [];
    const items = hits.map((hit: { _source: unknown }) => hit._source);

    res.json(items);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'SEARCH_ERROR' });
  }
});

export default router;
