// Utility to format various date inputs to DD/MM/YYYY for display
export function formatDateDDMMYYYY(input?: string | null): string {
  if (!input) return 'N/A';

  const s = String(input).trim();

  // Already in DD/MM/YYYY format
  const dmY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (dmY.test(s)) return s;

  // ISO-like YYYY-MM-DD or full ISO
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
  }

  // Try Date.parse for other formats
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Fallback: return original string
  return s;
}

export default { formatDateDDMMYYYY };
