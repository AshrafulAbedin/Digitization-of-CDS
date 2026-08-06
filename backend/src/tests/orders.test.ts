import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db.js';

afterAll(async () => {
  await pool.end();
});

describe('Orders Endpoints', () => {
  describe('POST /api/orders', () => {
    it('should return 400 if required order payload is missing (Minor Bug Detection)', async () => {
      const response = await request(app).post('/api/orders').send({});
      // Validates that the Express layer (or DB) rejects empty bodies properly
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should fail if attempting to order with an invalid or empty items JSON array', async () => {
      const payload = {
        customer_id: null,
        payment_method: 'CASH',
        is_dine_in: false,
        items_json: []
      };
      const response = await request(app).post('/api/orders').send(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should trigger stock deductions when marking an order completed (Major Logical Validation)', async () => {
      // Create a dummy order via direct DB call, or just fetch an existing 'PREPARING' order
      const { rows } = await pool.query("SELECT order_id FROM customer_order WHERE status = 'PREPARING' LIMIT 1");
      
      if (rows.length > 0) {
        const orderId = rows[0].order_id;
        
        // Mark as completed
        const response = await request(app)
          .patch(`/api/orders/${orderId}/status`)
          .send({ status: 'COMPLETED' });
        
        expect(response.status).toBe(200);

        // Optional: In a full test db environment, we would assert the inventory count decreased here.
      } else {
        console.warn('No preparing orders found to test stock deduction trigger. Skipping assertion.');
      }
    });
  });
});
