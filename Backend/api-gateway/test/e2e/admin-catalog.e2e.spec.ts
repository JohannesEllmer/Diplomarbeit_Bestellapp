import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { bootstrapUsersAndTokens, createE2EApp } from '../utils/e2e';

describe('AdminOrders + Catalog (MenuItems, Menus, MealPlans) (e2e)', () => {
  let app: INestApplication;
  let http: any;

  let tokenAdmin: string;
  let tokenUser: string;

  let menuItemId: string | undefined;
  let menuId: string | undefined;
  let mealPlanId: string | undefined;

  beforeAll(async () => {
    app = await createE2EApp();
    http = app.getHttpServer();

    const t = await bootstrapUsersAndTokens(app);
    tokenAdmin = t.admin;
    tokenUser = t.user;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('MenuItems', () => {
    it('POST /api/menu-items (admin create)', async () => {
      const res = await request(http)
        .post('/api/menu-items')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          name: 'Test Item',
          price: 2.5,
          category: 'Snack',
          vegetarian: true,
          allergens: [],
          description: 'E2E item',
          drink: false,
          dessert: false,
        })
        .expect((r) => {
          if (![200, 201].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      menuItemId = res.body?.id ?? res.body?.data?.id;
      expect(menuItemId).toBeTruthy();
    });

    it('GET /api/menu-items', async () => {
      const res = await request(http)
        .get('/api/menu-items')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/menu-items/{id}', async () => {
      if (!menuItemId) throw new Error('menuItemId missing');

      const res = await request(http)
        .get(`/api/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(res.body).toEqual(expect.any(Object));
    });

    it('PATCH /api/menu-items/{id} (admin update)', async () => {
      if (!menuItemId) throw new Error('menuItemId missing');

      const res = await request(http)
        .patch(`/api/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ price: 3.0 })
        .expect((r) => {
          if (![200, 204].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      if (res.status !== 204) expect(res.body ?? {}).toEqual(expect.any(Object));
    });
  });

  describe('Menus', () => {
    it('POST /api/menus (admin create)', async () => {
      const body: any = { title: 'Test Menu' };
      if (menuItemId) body.menuItemIds = [menuItemId]; // ggf. an DTO anpassen

      const res = await request(http)
        .post('/api/menus')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(body)
        .expect((r) => {
          if (![200, 201, 400].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      if ([200, 201].includes(res.status)) {
        menuId = res.body?.id ?? res.body?.data?.id;
        expect(menuId).toBeTruthy();
      }
    });

    it('GET /api/menus', async () => {
      const res = await request(http)
        .get('/api/menus')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('MealPlans', () => {
    it('POST /api/meal-plans (admin create)', async () => {
      const res = await request(http)
        .post('/api/meal-plans')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ title: 'Test MealPlan' })
        .expect((r) => {
          if (![200, 201].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      mealPlanId = res.body?.id ?? res.body?.data?.id;
      expect(mealPlanId).toBeTruthy();
    });

    it('GET /api/meal-plans', async () => {
      const res = await request(http)
        .get('/api/meal-plans')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/meal-plans/{id}/items/{menuItemId} (attach item)', async () => {
      if (!mealPlanId || !menuItemId) return;

      await request(http)
        .post(`/api/meal-plans/${mealPlanId}/items/${menuItemId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect((r) => {
          if (![200, 201, 204].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });
    });

    it('POST /api/meal-plans/{id}/select', async () => {
      if (!mealPlanId) throw new Error('mealPlanId missing');

      await request(http)
        .post(`/api/meal-plans/${mealPlanId}/select`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect((r) => {
          if (![200, 204].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });
    });

    it('GET /api/meal-plans/selected', async () => {
      const res = await request(http)
        .get('/api/meal-plans/selected')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('GET /api/meal-plans/{id}', async () => {
      if (!mealPlanId) throw new Error('mealPlanId missing');

      const res = await request(http)
        .get(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);

      expect(res.body).toEqual(expect.any(Object));
    });

    it('PATCH /api/meal-plans/{id}', async () => {
      if (!mealPlanId) throw new Error('mealPlanId missing');

      const res = await request(http)
        .patch(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ title: 'Updated MealPlan' })
        .expect((r) => {
          if (![200, 204].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });

      if (res.status !== 204) expect(res.body ?? {}).toEqual(expect.any(Object));
    });
  });

  describe('AdminOrders', () => {
    it('GET /api/admin/orders', async () => {
      const res = await request(http)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('PATCH /api/admin/orders/complete', async () => {
      await request(http)
        .patch('/api/admin/orders/complete')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ orderId: 'dummy' }) // DTO anpassen
        .expect((r) => {
          if (![200, 204, 400, 404].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });
    });
  });

  afterAll(async () => {
    if (!http) return;

    if (menuId) {
      await request(http)
        .delete(`/api/menus/${menuId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect((r) => {
          if (![200, 204, 404].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });
    }

    if (mealPlanId) {
      await request(http)
        .delete(`/api/meal-plans/${mealPlanId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect((r) => {
          if (![200, 204, 404].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });
    }

    if (menuItemId) {
      await request(http)
        .delete(`/api/menu-items/${menuItemId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect((r) => {
          if (![200, 204, 404].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
        });
    }
  });
});