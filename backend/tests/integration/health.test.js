/**
 * @jest-environment node
 */
const request = require('supertest');
const createApp = require('../../src/app');

describe('health endpoints', () => {
  const app = createApp();

  test('GET /api/v1/health returns success', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  test('GET / returns API metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.data.frontend).toContain('3011');
  });
});
