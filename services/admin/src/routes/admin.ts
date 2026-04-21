import { Router } from 'express';
import { pool, authPool, itemPool, matchingPool } from '../db';
import { authenticate } from '../middleware/authenticate';

export const adminRoutes = Router();

// Apply authentication middleware to all routes
adminRoutes.use(authenticate);

// GET /api/admin/dashboard - Summary stats
adminRoutes.get('/dashboard', async (req, res) => {
  try {
    // Aggregate stats from multiple databases
    const [usersResult, itemsResult, matchesResult, claimsResult] = await Promise.all([
      authPool.query('SELECT COUNT(*) as count FROM users'),
      itemPool.query('SELECT COUNT(*) as count FROM items WHERE status != $1', ['deleted']),
      matchingPool.query('SELECT COUNT(*) as count FROM matches'),
      itemPool.query('SELECT COUNT(*) as count FROM claims')
    ]);

    res.json({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalItems: parseInt(itemsResult.rows[0].count),
      totalMatches: parseInt(matchesResult.rows[0].count),
      totalClaims: parseInt(claimsResult.rows[0].count)
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/admin/users - Search users
adminRoutes.get('/users', async (req, res) => {
  try {
    const { q } = req.query;
    let query = 'SELECT id, email, name, role, is_active, created_at FROM users';
    let params: any[] = [];

    if (q && typeof q === 'string') {
      query += ' WHERE email ILIKE $1 OR name ILIKE $1';
      params.push(`%${q}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await authPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

// PUT /api/admin/users/:id/deactivate - Deactivate user
adminRoutes.put('/users/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'INVALID_USER_ID' });
    }

    const result = await authPool.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, email, is_active',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    res.json({ 
      message: 'User deactivated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('User deactivation error:', error);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

// DELETE /api/admin/items/:id - Remove item
adminRoutes.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'INVALID_ITEM_ID' });
    }

    // Get item details first to check if it exists and get image URLs
    const itemResult = await itemPool.query(
      'SELECT id, image_url, thumbnail_url FROM items WHERE id = $1 AND status != $2',
      [id, 'deleted']
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
    }

    const item = itemResult.rows[0];

    // Mark item as deleted (soft delete)
    await itemPool.query(
      'UPDATE items SET status = $1, updated_at = NOW() WHERE id = $2',
      ['deleted', id]
    );

    // TODO: Trigger image cleanup if image_url or thumbnail_url exist
    // This would typically involve calling the Image Service to delete the images
    // For now, we'll just log the image URLs that should be cleaned up
    if (item.image_url || item.thumbnail_url) {
      console.log(`Item ${id} deleted. Images to cleanup:`, {
        image_url: item.image_url,
        thumbnail_url: item.thumbnail_url
      });
    }

    res.json({ 
      message: 'Item removed successfully',
      itemId: id
    });
  } catch (error) {
    console.error('Item removal error:', error);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/admin/claims - List pending claims
adminRoutes.get('/claims', async (req, res) => {
  try {
    const result = await itemPool.query(`
      SELECT 
        c.id,
        c.item_id,
        c.claimant_id,
        c.status,
        c.created_at,
        c.updated_at,
        i.title as item_title,
        i.type as item_type,
        i.category as item_category,
        i.location as item_location
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE c.status = $1
      ORDER BY c.created_at ASC
    `, ['pending']);

    res.json(result.rows);
  } catch (error) {
    console.error('Claims listing error:', error);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});