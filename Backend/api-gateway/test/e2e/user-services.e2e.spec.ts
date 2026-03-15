import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { bootstrapUsersAndTokens, createE2EApp } from '../utils/e2e';

describe('Users + AdminUsers + MyOrders (e2e)', () => {
  let app: INestApplication;
  let http: any;

  let tokenUser: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    app = await createE2EApp();
    http = app.getHttpServer();

    const t = await bootstrapUsersAndTokens(app);
    tokenUser = t.user;
    tokenAdmin = t.admin;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Users (me)', () => {
    it('GET /api/users/me/header', async () => {
      const res = await request(http)
        .get('/api/users/me/header')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(res.body).toEqual(expect.any(Object));
    });

    it('GET /api/users/me/profile', async () => {
      const res = await request(http)
        .get('/api/users/me/profile')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(res.body).toEqual(expect.any(Object));
    });

    it('GET /api/users/me/activity', async () => {
      const res = await request(http)
        .get('/api/users/me/activity')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(res.body).toEqual(expect.any(Object));
    });

    it('PATCH /api/users/me/class', async () => {
      const res = await request(http)
        .patch('/api/users/me/class')
        .set('Authorization', `Bearer ${tokenUser}`)
        .send({ class: '1A' }) 
        .expect((r) => {
          if (![200, 204].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      if (res.status === 200) expect(res.body).toEqual(expect.any(Object));
    });

    it('POST /api/users/me/balance-requests/add', async () => {
      const res = await request(http)
        .post('/api/users/me/balance-requests/add')
        .set('Authorization', `Bearer ${tokenUser}`)
        .send({ amount: 10 })
        .expect((r) => {
          if (![200, 201].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      expect(res.body ?? {}).toEqual(expect.any(Object));
    });

    it('POST /api/users/me/balance-requests/flush', async () => {
      const res = await request(http)
        .post('/api/users/me/balance-requests/flush')
        .set('Authorization', `Bearer ${tokenUser}`)
        .send({})
        .expect((r) => {
          if (![200, 201, 204].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      if (res.status !== 204) expect(res.body ?? {}).toEqual(expect.any(Object));
    });
  });

  describe('Users (admin list/get/update/delete)', () => {
    let createdUserId: string;

    it('POST /api/users (create another user)', async () => {
      const unique = Date.now();
      const res = await request(http)
        .post('/api/users')
        .send({ email: `another_${unique}@test.local`, password: 'Test1234!' })
        .expect((r) => {
          if (![200, 201].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      createdUserId = res.body?.id ?? res.body?.user?.id ?? res.body?.data?.id;
      expect(createdUserId).toBeTruthy();
    });

    it('GET /api/users (admin list)', async () => {
      const res = await request(http)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/users/{id}', async () => {
      const res = await request(http)
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body).toEqual(expect.any(Object));
    });

    it('PATCH /api/users/{id}', async () => {
      const res = await request(http)
        .patch(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ active: true }) 
        .expect((r) => {
          if (![200, 204].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      if (res.status !== 204) expect(res.body ?? {}).toEqual(expect.any(Object));
    });

    it('PATCH /api/users/{id}/balance', async () => {
      const res = await request(http)
        .patch(`/api/users/${createdUserId}/balance`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ amount: 5 }) 
        .expect((r) => {
          if (![200, 204].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      if (res.status !== 204) expect(res.body ?? {}).toEqual(expect.any(Object));
    });

    it('DELETE /api/users/{id}', async () => {
      await request(http)
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect((r) => {
          if (![200, 204].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });
    });
  });

  describe('AdminUsers', () => {
    it('PATCH /api/admin/users/balance/confirm', async () => {
      await request(http)
        .patch('/api/admin/users/balance/confirm')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ confirm: true }) // DTO anpassen
        .expect((r) => {
          if (![200, 204, 400, 404].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });
    });
  });

  describe('MyOrders', () => {
    it('GET /api/orders/my', async () => {
      const res = await request(http)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/orders (create order) – requires real menuItemIds', async () => {
      const res = await request(http)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenUser}`)
        .send({ items: [] })
        .expect((r) => {
          if (![200, 201, 400].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      if ([200, 201].includes(res.status)) expect(res.body).toEqual(expect.any(Object));
    });
  });
});