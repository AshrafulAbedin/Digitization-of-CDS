import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db.js';

afterAll(async () => {
  await pool.end();
});

describe('Inventory Endpoints', () => {
  describe('GET /api/inventory/raw-materials', () => {
    it('should successfully retrieve the raw materials list', async () => {
      const response = await request(app).get('/api/inventory/raw-materials');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/inventory/stockout', () => {
    it('should reject a stockout request with missing parameters (Minor Bug Detection)', async () => {
      const response = await request(app).post('/api/inventory/stockout').send({
        // Missing menu_item_id and quantity
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/inventory/daily-stock/init', () => {
    it('should initialize daily stock successfully', async () => {
      const response = await request(app).post('/api/inventory/daily-stock/init');
      // Initialization returns { success: true } or similar via the PL/pgSQL function
      expect(response.status).toBe(200);
    });
  });
});
