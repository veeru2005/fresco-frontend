export type PricingOption = {
  unit: string;
  price: number;
};

export type PricingUnitGroup = 'kg' | 'dozen' | 'liquid';

export const PRODUCT_UNIT_OPTIONS = ['1 kg', 'half kg', '1 dozen', 'half dozen', '1 litre', '500 ml', '250 ml'] as const;
const UNIT_GROUPS: Record<PricingUnitGroup, readonly string[]> = {
  kg: ['1 kg', 'half kg'],
  dozen: ['1 dozen', 'half dozen'],
  liquid: ['1 litre', '500 ml', '250 ml'],
};
const UNIT_TO_GROUP: Record<string, PricingUnitGroup> = {
  '1 kg': 'kg',
  'half kg': 'kg',
  '1 dozen': 'dozen',
  'half dozen': 'dozen',
  '1 litre': 'liquid',
  '500 ml': 'liquid',
  '250 ml': 'liquid',
};

const UNIT_ALIASES: Record<string, string> = {
  kg: '1 kg',
  '1kg': '1 kg',
  'halfkg': 'half kg',
  dozen: '1 dozen',
  '1dozen': '1 dozen',
  'halfdozen': 'half dozen',
  liter: '1 litre',
  litre: '1 litre',
  '1 liter': '1 litre',
  '1 litre': '1 litre',
  gm: 'half kg',
  ml: '500 ml',
  '500ml': '500 ml',
  '250ml': '250 ml',
};

export const normalizeUnitLabel = (value?: string, fallback = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;

  const mapped = UNIT_ALIASES[normalized] || normalized;
  const canonical = PRODUCT_UNIT_OPTIONS.find((unit) => unit.toLowerCase() === mapped.toLowerCase());
  return canonical || fallback;
};

export const getPricingUnitGroup = (unit?: string): PricingUnitGroup | '' => {
  const normalized = normalizeUnitLabel(unit || '');
  return normalized ? (UNIT_TO_GROUP[normalized] || '') : '';
};

export const getAllowedPricingUnits = (units: string[]) => {
  const normalized = units.map((unit) => normalizeUnitLabel(unit)).filter(Boolean);
  if (!normalized.length) return [...PRODUCT_UNIT_OPTIONS];

  const groups = [...new Set(normalized.map((unit) => UNIT_TO_GROUP[unit]).filter(Boolean))];
  if (groups.length !== 1) return [];

  const activeGroup = groups[0] as PricingUnitGroup;
  return [...UNIT_GROUPS[activeGroup]];
};

const toPositivePrice = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
};

export const getProductPricingOptions = (product: any): PricingOption[] => {
  const options: PricingOption[] = [];
  const seenUnits = new Set<string>();
  const rawOptions = Array.isArray(product?.pricingOptions) ? product.pricingOptions : [];

  rawOptions.forEach((item: any) => {
    if (options.length >= 3) return;

    const unit = normalizeUnitLabel(item?.unit || item?.label || item?.name || '');
    const price = toPositivePrice(item?.price);

    if (!unit || !price || seenUnits.has(unit)) return;
    seenUnits.add(unit);
    options.push({ unit, price });
  });

  if (options.length) return options;

  const fallbackUnit = normalizeUnitLabel(product?.unit, '1 kg') || '1 kg';
  const fallbackPrice = toPositivePrice(product?.price);

  if (fallbackPrice > 0) {
    return [{ unit: fallbackUnit, price: fallbackPrice }];
  }

  return [{ unit: '1 kg', price: 0 }];
};

export const getPrimaryPricingOption = (product: any): PricingOption => {
  const options = getProductPricingOptions(product);
  return options[0] || { unit: '1 kg', price: 0 };
};

export const getPricingOptionByUnit = (product: any, unit?: string): PricingOption => {
  const options = getProductPricingOptions(product);
  if (!options.length) return { unit: '1 kg', price: 0 };

  const normalizedUnit = normalizeUnitLabel(unit || '');
  if (normalizedUnit) {
    const matched = options.find((option) => option.unit === normalizedUnit);
    if (matched) return matched;
  }

  return options[0];
};

export const getMaxAllowedPricingOptions = (units: string[]) => {
  if (!units.length) return 2;
  const normalized = units.map((unit) => normalizeUnitLabel(unit)).filter(Boolean);
  if (!normalized.length) return 2;

  const groups = [...new Set(normalized.map((unit) => UNIT_TO_GROUP[unit]).filter(Boolean))];
  if (groups.length !== 1) return 0;

  const activeGroup = groups[0] as PricingUnitGroup;
  return UNIT_GROUPS[activeGroup].length;
};

export const sanitizePricingOptionsForSave = (rawOptions: Array<{ unit?: string; price?: string | number }>) => {
  const options: PricingOption[] = [];
  const seenUnits = new Set<string>();

  rawOptions.forEach((raw) => {
    if (options.length >= 3) return;

    const unit = normalizeUnitLabel(raw.unit || '');
    const price = toPositivePrice(raw.price);
    if (!unit || !price || seenUnits.has(unit)) return;

    seenUnits.add(unit);
    options.push({ unit, price });
  });

  return options;
};
