import type { Pool, PoolClient } from 'pg';

export type Db = Pool | PoolClient;

export class OrdersRepo {
  // -------- listing ids --------
  async listIdsByUser(db: Db, userId: string) {
    const r = await db.query(
      `SELECT id FROM app.orders WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId],
    );
    return (r.rows ?? []).map(x => String(x.id));
  }

  async listIdsAll(db: Db) {
    const r = await db.query(`SELECT id FROM app.orders ORDER BY created_at DESC`);
    return (r.rows ?? []).map(x => String(x.id));
  }

  // -------- create + lock --------
  async lockUserBalance(db: Db, userId: string) {
    return db.query(
      `SELECT id, balance FROM app.users WHERE id=$1 FOR UPDATE`,
      [userId],
    );
  }

  async insertOpenOrder(db: Db, userId: string) {
    const r = await db.query(
      `INSERT INTO app.orders (user_id,total_price,created_at,status)
       VALUES ($1,0,NOW(),'open') RETURNING id`,
      [userId],
    );
    return String(r.rows[0].id);
  }

  async updateOrderTotal(db: Db, orderId: string, total: number) {
    await db.query(`UPDATE app.orders SET total_price=$2 WHERE id=$1`, [orderId, total]);
  }

  async debitUser(db: Db, userId: string, total: number) {
    await db.query(`UPDATE app.users SET balance = balance - $2 WHERE id=$1`, [userId, total]);
  }

  // -------- order close (qr) --------
  async lockOrder(db: Db, orderId: string) {
    return db.query(
      `SELECT id, status FROM app.orders WHERE id=$1 FOR UPDATE`,
      [orderId],
    );
  }

  async closeOrder(db: Db, orderId: string) {
    await db.query(`UPDATE app.orders SET status='closed' WHERE id=$1`, [orderId]);
  }

  async markDelivered(db: Db, orderId: string) {
    await db.query(
      `UPDATE app.order_items
       SET delivered=true, delivery_time=COALESCE(delivery_time, now())
       WHERE order_id=$1`,
      [orderId],
    );
  }

  // -------- items + validation helpers --------
  async getActiveMealPlanId(db: Db): Promise<string | null> {
    const r = await db.query(
      `SELECT selected_meal_plan_id AS id FROM app.app_settings LIMIT 1`,
    );
    const id = String(r.rows?.[0]?.id ?? '').trim();
    return id || null;
  }

  async assertItemInActiveMenu(db: Db, mealPlanId: string, menuItemId: string) {
    const r = await db.query(
      `SELECT 1 FROM app.meal_plan_items
       WHERE meal_plan_id=$1 AND menu_item_id=$2 LIMIT 1`,
      [mealPlanId, menuItemId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async getMenuItemForOrder(db: Db, menuItemId: string) {
    return db.query(
      `SELECT id, price, available FROM app.menu_items WHERE id=$1 LIMIT 1`,
      [menuItemId],
    );
  }

  async insertOrderItem(
    db: Db,
    orderId: string,
    userId: string,
    menuItemId: string,
    qty: number,
    note: string | null,
    deliveryTime: Date | null,
  ) {
    await db.query(
      `INSERT INTO app.order_items
        (order_id, menu_item_id, user_id, note, quantity, delivery_time)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [orderId, menuItemId, userId, note, qty, deliveryTime],
    );
  }

  async deleteOrderItems(db: Db, orderId: string) {
    await db.query(`DELETE FROM app.order_items WHERE order_id=$1`, [orderId]);
  }

  async deleteOrder(db: Db, orderId: string) {
    await db.query(`DELETE FROM app.orders WHERE id=$1`, [orderId]);
  }

  // -------- response building --------
  async loadOrderHeader(db: Db, orderId: string) {
    return db.query(
      `SELECT o.id,o.user_id,o.total_price,o.created_at,o.status,o.qr_code_url,
              u.id as u_id,u.name as u_name,u.email as u_email,u.class as u_class,
              u.balance as u_balance,u.blocked as u_blocked
       FROM app.orders o
       JOIN app.users u ON u.id=o.user_id
       WHERE o.id=$1 LIMIT 1`,
      [orderId],
    );
  }

  async loadOrderCount(db: Db, userId: string) {
    return db.query(
      `SELECT COUNT(*)::int AS count FROM app.orders WHERE user_id=$1`,
      [userId],
    );
  }

  async loadOrderItems(db: Db, orderId: string) {
    return db.query(
      `SELECT oi.quantity,oi.note,oi.delivered,oi.delivery_time,
              m.id as m_id,m.name as m_name,m.description as m_description,
              m.price as m_price,m.category as m_category,m.available as m_available,
              m.vegetarian as m_vegetarian,m.allergens as m_allergens,
              m.drink as m_drink,m.dessert as m_dessert
       FROM app.order_items oi
       JOIN app.menu_items m ON m.id=oi.menu_item_id
       WHERE oi.order_id=$1
       ORDER BY oi.id ASC`,
      [orderId],
    );
  }
}
