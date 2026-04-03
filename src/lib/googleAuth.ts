const GOOGLE_CLIENT_ID_PLACEHOLDER = 'YOUR_GOOGLE_OAUTH_CLIENT_ID';

const normalizeOrigin = (value: string): string => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
};

export const isValidGoogleClientId = (clientId?: string): boolean =>
  !!clientId &&
  clientId.endsWith('.apps.googleusercontent.com') &&
  !clientId.includes(GOOGLE_CLIENT_ID_PLACEHOLDER);

const parseClientIdMapFromJson = (raw: string): Record<string, string> | null => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [origin, clientId]) => {
      const normalizedOrigin = normalizeOrigin(origin);
      const normalizedClientId = String(clientId || '').trim();
      if (normalizedOrigin && normalizedClientId) {
        acc[normalizedOrigin] = normalizedClientId;
      }
      return acc;
    }, {});
  } catch {
    return null;
  }
};

const parseClientIdMapFromPairs = (raw: string): Record<string, string> =>
  raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex === -1) return acc;

      const origin = normalizeOrigin(entry.slice(0, separatorIndex));
      const clientId = entry.slice(separatorIndex + 1).trim();
      if (!origin || !clientId) return acc;

      acc[origin] = clientId;
      return acc;
    }, {});

const getOriginClientIdMap = (): Record<string, string> => {
  const raw = String(import.meta.env.VITE_GOOGLE_CLIENT_IDS_BY_ORIGIN || '').trim();
  if (!raw) return {};

  const jsonMap = parseClientIdMapFromJson(raw);
  if (jsonMap) return jsonMap;

  return parseClientIdMapFromPairs(raw);
};

export const getGoogleClientIdForCurrentOrigin = (): string | null => {
  const currentOrigin = normalizeOrigin(window.location.origin);
  const originMap = getOriginClientIdMap();

  const mappedClientId = originMap[currentOrigin];
  if (isValidGoogleClientId(mappedClientId)) return mappedClientId;

  const defaultClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (isValidGoogleClientId(defaultClientId)) return defaultClientId;

  return null;
};

export const getGoogleOriginConfigMessage = (): string => {
  const origin = normalizeOrigin(window.location.origin) || 'this site';
  return `Google sign-in is not configured for ${origin}. Add it to Authorized JavaScript origins in Google Cloud Console.`;
};