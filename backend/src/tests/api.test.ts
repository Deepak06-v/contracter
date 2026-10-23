import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { env } from '../config/env';
import {
  determinePaymentStatus,
  calculateOutstandingAmount,
  hasPriceDiscrepancy,
} from '../services/calculationService';

let contractorToken: string;
let agent1Token: string;
let agent2Token: string;
let site1Id: string;
let site2Id: string;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI);
  }

  // 1. Authenticate Contractor
  const contractorLogin = await request(app)
    .post('/api/auth/login')
    .send({
      email: env.DEMO_CONTRACTOR_EMAIL,
      password: env.DEMO_CONTRACTOR_PASSWORD,
    });
  expect(contractorLogin.status).toBe(200);
  contractorToken = contractorLogin.body.token;

  // 2. Authenticate Agent 1
  const agent1Login = await request(app)
    .post('/api/auth/login')
    .send({
      email: env.DEMO_AGENT_EMAIL,
      password: env.DEMO_AGENT_PASSWORD,
    });
  expect(agent1Login.status).toBe(200);
  agent1Token = agent1Login.body.token;

  // 3. Authenticate Agent 2
  const agent2Login = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'agent2@example.com',
      password: 'Agent2@123',
    });
  expect(agent2Login.status).toBe(200);
  agent2Token = agent2Login.body.token;

  // 4. Retrieve Sites to get IDs
  const sitesRes = await request(app)
    .get('/api/sites')
    .set('Authorization', `Bearer ${contractorToken}`);
  expect(sitesRes.status).toBe(200);

  const s1 = sitesRes.body.sites.find((s: any) => s.code === 'SITE-BLR-01');
  const s2 = sitesRes.body.sites.find((s: any) => s.code === 'SITE-BLR-02');
  site1Id = s1?._id;
  site2Id = s2?._id;
});

describe('1. Authentication & Session Security', () => {
  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: env.DEMO_CONTRACTOR_EMAIL, password: 'WrongPassword999' });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid');
  });

  it('should get current user profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${contractorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('contractor');
  });

  it('should reject unauthenticated requests to protected routes', async () => {
    const res = await request(app).get('/api/sites');
    expect(res.status).toBe(401);
  });
});

describe('2. Role-Based Access Control', () => {
  it('contractor can access agent management', async () => {
    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${contractorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.agents)).toBe(true);
  });

  it('agent is strictly FORBIDDEN from accessing agent management (403)', async () => {
    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${agent1Token}`);
    expect(res.status).toBe(403);
  });

  it('agent can ONLY view assigned sites in site list', async () => {
    const res = await request(app)
      .get('/api/sites')
      .set('Authorization', `Bearer ${agent1Token}`);
    expect(res.status).toBe(200);

    const siteCodes = res.body.sites.map((s: any) => s.code);
    expect(siteCodes).toContain('SITE-BLR-01'); // assigned to Agent 1
    expect(siteCodes).not.toContain('SITE-BLR-02'); // assigned ONLY to Agent 2
  });

  it('agent cannot access details of an unassigned site (403)', async () => {
    // Agent 1 attempts to get details of Site 2 (assigned to Agent 2)
    const res = await request(app)
      .get(`/api/sites/${site2Id}`)
      .set('Authorization', `Bearer ${agent1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });

  it('agent cannot access transactions of an unassigned site (403)', async () => {
    const res = await request(app)
      .get(`/api/transactions?siteId=${site2Id}`)
      .set('Authorization', `Bearer ${agent1Token}`);
    expect(res.status).toBe(403);
  });
});

describe('3. Calculations & Business Logic', () => {
  it('correctly calculates payment statuses', () => {
    expect(determinePaymentStatus(1000, 1000)).toBe('Paid');
    expect(determinePaymentStatus(1000, 1200)).toBe('Paid');
    expect(determinePaymentStatus(1000, 400)).toBe('Partially Paid');
    expect(determinePaymentStatus(1000, 0)).toBe('Unpaid');
  });

  it('correctly calculates outstanding balance with safe decimal math', () => {
    expect(calculateOutstandingAmount(100.5, 30.25)).toBe(70.25);
    expect(calculateOutstandingAmount(100, 150)).toBe(0);
  });

  it('flags price discrepancies between total and (quantity * unitPrice)', () => {
    // Quantity 10 * UnitPrice 50 = 500, but entered total is 550 (e.g. freight added)
    const discrepancy = hasPriceDiscrepancy(550, 10, 50);
    expect(discrepancy.hasDiscrepancy).toBe(true);
    expect(discrepancy.suggestedAmount).toBe(500);
    expect(discrepancy.difference).toBe(50);

    // Matching entry
    const match = hasPriceDiscrepancy(500, 10, 50);
    expect(match.hasDiscrepancy).toBe(false);
  });
});

describe('4. Transaction & Proof Photo Handling', () => {
  it('agent can create a transaction with proof photo on assigned site', async () => {
    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${agent1Token}`)
      .field('site', site1Id)
      .field('date', new Date().toISOString())
      .field('title', 'Red Bricks Delivery - 5000 pcs')
      .field('category', 'Materials')
      .field('materialName', 'Red Bricks')
      .field('quantity', '5000')
      .field('unit', 'pieces')
      .field('unitPrice', '9.5')
      .field('totalAmount', '47500')
      .field('amountPaid', '25000')
      .field('supplier', 'Standard Brick Kiln')
      .attach('proofPhoto', dummyImageBuffer, 'sample_receipt.png');

    expect(res.status).toBe(201);
    expect(res.body.transaction._id).toBeDefined();
    expect(res.body.transaction.paymentStatus).toBe('Partially Paid');
    expect(res.body.transaction.proofPhoto.filename).toBeDefined();

    // Verify authenticated photo streaming
    const photoRes = await request(app)
      .get(`/api/transactions/${res.body.transaction._id}/photo`)
      .set('Authorization', `Bearer ${agent1Token}`);
    expect(photoRes.status).toBe(200);

    // Agent 2 should NOT be able to view photo of Site 1
    const unauthPhotoRes = await request(app)
      .get(`/api/transactions/${res.body.transaction._id}/photo`)
      .set('Authorization', `Bearer ${agent2Token}`);
    expect(unauthPhotoRes.status).toBe(403);
  });

  it('rejects transaction creation if proof photo is missing', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${agent1Token}`)
      .field('site', site1Id)
      .field('date', new Date().toISOString())
      .field('title', 'Expense without receipt')
      .field('category', 'Miscellaneous')
      .field('totalAmount', '1000');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Proof photo is required');
  });

  it('rejects transaction creation on site not assigned to agent', async () => {
    const dummyImageBuffer = Buffer.from('demo', 'utf-8');
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${agent1Token}`)
      .field('site', site2Id) // Site 2 is NOT assigned to Agent 1
      .field('date', new Date().toISOString())
      .field('title', 'Illegal cross-site expense')
      .field('category', 'Miscellaneous')
      .field('totalAmount', '1000')
      .attach('proofPhoto', dummyImageBuffer, 'photo.jpg');

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });
});

describe('5. CSV Export & Reporting', () => {
  it('contractor can export transactions CSV with Excel BOM', async () => {
    const res = await request(app)
      .get('/api/reports/transactions/export')
      .set('Authorization', `Bearer ${contractorToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    // First byte of response text should contain BOM \uFEFF
    expect(res.text.startsWith('\uFEFF')).toBe(true);
    expect(res.text).toContain('Total Amount (₹)');
    expect(res.text).toContain('SITE-BLR-01');
  });

  it('agent CSV export contains ONLY their assigned site records', async () => {
    const res = await request(app)
      .get('/api/reports/transactions/export')
      .set('Authorization', `Bearer ${agent1Token}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('SITE-BLR-01');
    expect(res.text).not.toContain('SITE-BLR-02'); // Site 2 was assigned only to Agent 2
  });
});
