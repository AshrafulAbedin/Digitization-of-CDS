import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db.js';

// Setup and Teardown
afterAll(async () => {
  await pool.end();
});

describe('Customer Endpoints', () => {
  describe('GET /api/customers/search', () => {
    it('should return 400 if no search parameter is provided (Minor Bug Detection)', async () => {
      const response = await request(app).get('/api/customers/search');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should search successfully by phone number', async () => {
      const response = await request(app).get('/api/customers/search?phone=01700000000');
      // Status might be 200 (found) or 404 (not found). We just check for successful execution.
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('POST /api/customers/register', () => {
    it('should fail registration if mandatory fields are missing (Logical Validation)', async () => {
      const payload = { phone: '01899999999' }; // Missing name, etc.
      const response = await request(app)
        .post('/api/customers/register')
        .send(payload);
      
      // Depending on the exact logic in register_customer (PL/pgSQL), it should fail.
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should successfully register a valid new customer', async () => {
      const uniquePhone = `018${Math.floor(10000000 + Math.random() * 90000000)}`;
      const payload = {
        name: 'Test Customer',
        phone: uniquePhone,
        customerType: 'Regular',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/customers/register')
        .send(payload);
      
      expect(response.status).toBe(201);
    });
  });
});
