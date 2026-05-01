const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
const app = require('../index');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('API Routes', () => {
  it('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('ok');
  });

  describe('Auth Routes', () => {
    it('POST /api/auth/request-otp should return 400 for invalid phone', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: 'invalid' });
      expect(res.statusCode).toEqual(400);
    });

    it('POST /api/auth/request-otp should return 200 for valid phone', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '+1234567890' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('OTP sent successfully');
    });
  });

  describe('Profile Routes', () => {
    it('GET /api/profiles/me should return 401 if unauthorized', async () => {
      const res = await request(app).get('/api/profiles/me');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('Match Routes', () => {
    it('GET /api/matches should return 401 if unauthorized', async () => {
      const res = await request(app).get('/api/matches');
      expect(res.statusCode).toEqual(401);
    });
  });
});
