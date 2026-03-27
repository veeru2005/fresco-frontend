// Helpers for sorting order lists by most recent order date
type OrderLike = Record<string, any>;

function parseOrderDate(order: OrderLike): number {
  const d = order?.bookingDate || order?.booking_date || '';
  if (!d) return 0;

  // ISO-like (YYYY-MM-DD or ISO timestamp)
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const t = Date.parse(d);
    return isNaN(t) ? 0 : t;
  }

  // dd/MM/YYYY
  const dm = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d);
  if (dm) {
    const day = dm[1];
    const month = dm[2];
    const year = dm[3];
    const t = Date.parse(`${year}-${month}-${day}`);
    return isNaN(t) ? 0 : t;
  }

  // fallback to Date.parse for other formats
  const t = Date.parse(d);
  return isNaN(t) ? 0 : t;
}

export function sortOrdersByLatest(orders: OrderLike[] = []) {
  return orders.slice().sort((a, b) => parseOrderDate(b) - parseOrderDate(a));
}

export default { sortOrdersByLatest };
