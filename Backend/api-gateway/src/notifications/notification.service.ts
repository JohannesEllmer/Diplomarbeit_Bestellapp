import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationsRepo } from './notification.repo';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(id: any, name: string): string {
  const s = String(id ?? '').trim();
  if (!UUID_RE.test(s)) throw new BadRequestException(`${name}_INVALID`);
  return s;
}

function asUuidOrNull(v: any): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return UUID_RE.test(s) ? s : null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepo) {}

  listLatestForUser(userId: string, beforeId?: string | null, limit = 20) {
    const uid = requireUuid(userId, 'USER_ID');
    const safeBefore = asUuidOrNull(beforeId);

    const safeLimit = Math.max(1, Math.min(200, Number(limit || 20)));
    return this.repo.listLatest(uid, safeBefore, safeLimit);
  }

  markRead(userId: string, id: string) {
    const uid = requireUuid(userId, 'USER_ID');
    const nid = requireUuid(id, 'NOTIFICATION_ID');
    return this.repo.markRead(uid, nid);
  }

  clearForUser(userId: string) {
    const uid = requireUuid(userId, 'USER_ID');
    return this.repo.clearAll(uid);
  }

  ownerToday(limit = 200) {
    const safeLimit = Math.max(1, Math.min(500, Number(limit || 200)));
    return this.repo.listOwnerToday(safeLimit);
  }

  async creditChanged(
    audience: 'BOTH' | 'USER' | 'OWNER',
    userId: string,
    message: string,
  ) {
    const uid = requireUuid(userId, 'USER_ID');

    const title = 'Guthaben';
    const type = 'CREDIT_CHANGED';

    if (audience === 'BOTH') {
      await this.repo.insert({
        userId: uid,
        audience: 'USER',
        type,
        title,
        message,
        link: '/benachrichtigungen',
        data: { userId: uid },
      });

      await this.repo.insert({
        userId: null, 
        audience: 'OWNER',
        type,
        title,
        message,
        link: '/benachrichtigungen-heute',
        data: { userId: uid },
      });

      return { ok: true };
    }

    if (audience === 'USER') {
      await this.repo.insert({
        userId: uid,
        audience: 'USER',
        type,
        title,
        message,
        link: '/benachrichtigungen',
        data: { userId: uid },
      });
      return { ok: true };
    }

    // OWNER
    await this.repo.insert({
      userId: null,
      audience: 'OWNER',
      type,
      title,
      message,
      link: '/benachrichtigungen-heute',
      data: { userId: uid },
    });

    return { ok: true };
  }

  async orderCompleted(userId: string, orderId: string) {
    const uid = requireUuid(userId, 'USER_ID');
    const oid = String(orderId ?? '').trim();
    if (!oid) throw new BadRequestException('ORDER_ID_INVALID');

    await this.repo.insert({
      userId: uid,
      audience: 'USER',
      type: 'ORDER_COMPLETED',
      title: 'Bestellung abgeschlossen',
      message: `Deine Bestellung ${oid} wurde abgeschlossen.`,
      link: '/benachrichtigungen',
      data: { orderId: oid },
    });

    // optional Owner
    await this.repo.insert({
      userId: null,
      audience: 'OWNER',
      type: 'ORDER_COMPLETED',
      title: 'Bestellung abgeschlossen',
      message: `Bestellung ${oid} wurde abgeschlossen (User ${uid}).`,
      link: '/orders',
      data: { orderId: oid, userId: uid },
    });

    return { ok: true };
  }

  async ownerOrderIncoming(orderId: string, pickupAt: Date) {
    const oid = String(orderId ?? '').trim();
    if (!oid) throw new BadRequestException('ORDER_ID_INVALID');

    await this.repo.insert({
      userId: null,
      audience: 'OWNER',
      type: 'ORDER_INCOMING',
      title: 'Neue Bestellung',
      message: `Neue Bestellung ${oid}${pickupAt ? ` – Abholung: ${pickupAt.toISOString()}` : ''}`,
      link: '/orders',
      data: { orderId: oid, pickupAt: pickupAt ? pickupAt.toISOString() : null },
    });

    return { ok: true };
  }

  async userOrderSuccess(userId: string, orderId: string, pickupAt: Date) {
    const uid = requireUuid(userId, 'USER_ID');
    const oid = String(orderId ?? '').trim();
    if (!oid) throw new BadRequestException('ORDER_ID_INVALID');

    await this.repo.insert({
      userId: uid,
      audience: 'USER',
      type: 'ORDER_SUCCESS',
      title: 'Bestellung erfolgreich',
      message: `Bestellung ${oid} wurde erfolgreich erstellt.${pickupAt ? ` Abholung: ${pickupAt.toISOString()}` : ''}`,
      link: '/benachrichtigungen',
      data: { orderId: oid, pickupAt: pickupAt ? pickupAt.toISOString() : null },
    });

    return { ok: true };
  }

  /**
   * Backwards-compatible alias for older callers.
   */
  async customerOrderSuccess(userId: string, orderId: string, pickupAt: Date) {
    return this.userOrderSuccess(userId, orderId, pickupAt);
  }

  async deliverDue(): Promise<{ ok: true }> {
    return { ok: true };
  }
}
