export const MI_NOT_DELETED = `(mi.deleted_at IS NULL OR mi.deleted = false)`;
export const M_NOT_DELETED  = `(m.deleted_at IS NULL OR m.deleted = false)`;
export const MP_NOT_DELETED = `(mp.deleted_at IS NULL OR mp.deleted_at IS NULL)`; 


export function isMissingColumn(e: any): boolean {
  const msg = String(e?.message ?? '');
  return msg.includes('column') && msg.includes('does not exist');
}
