import { City, Country, State, type ICity, type ICountry, type IState } from 'country-state-city';

const normalize = (value: string) => String(value || '').trim().toLowerCase();
const compact = (value: unknown) => String(value ?? '').trim();

export const DEFAULT_COUNTRY = 'India';
export const DEFAULT_STATE = 'Andhra Pradesh';
export const ALLOWED_SERVICE_LOCATIONS = ['Mangalagiri', 'Vadeswaram', 'KL University'] as const;
const SERVICE_PINCODES_BY_CITY: Record<string, string[]> = {
  mangalagiri: ['522503'],
  vadeswaram: ['522502', '522302'],
  'kl university': ['522502', '522302'],
};

export const ALL_COUNTRIES: ICountry[] = Country.getAllCountries();

export const isAllowedServiceLocation = (value: string): boolean =>
  ALLOWED_SERVICE_LOCATIONS.some((location) => normalize(location) === normalize(value));

export const getAllowedPincodesForCity = (city: string): string[] => {
  const normalizedCity = normalize(city);
  const pincodes = SERVICE_PINCODES_BY_CITY[normalizedCity];
  return Array.isArray(pincodes) ? pincodes : [];
};

export const isAllowedPincodeForCity = (city: string, pincode: string): boolean => {
  const normalizedPincode = String(pincode || '').trim();
  if (!normalizedPincode) return false;
  return true; // Pincode restriction removed, any valid 6-digit pin is allowed
};

export type DeliveryAddressLike = {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export const formatCityStatePincode = (city: string, state: string, pincode: string): string => {
  const cityState = [compact(city), compact(state)].filter(Boolean).join(', ');
  const normalizedPincode = compact(pincode);

  if (cityState && normalizedPincode) {
    return `${cityState} - ${normalizedPincode}`;
  }

  return cityState || normalizedPincode;
};

export const buildDeliveryAddressLines = (address: DeliveryAddressLike): string[] => {
  return [
    compact(address.address),
    formatCityStatePincode(String(address.city || ''), String(address.state || ''), String(address.pincode || '')),
    compact(address.country),
  ].filter(Boolean);
};

export const findCountryByName = (countryName: string): ICountry | undefined => {
  const normalizedCountry = normalize(countryName);
  if (!normalizedCountry) return undefined;
  return ALL_COUNTRIES.find((country) => normalize(country.name) === normalizedCountry);
};

export const getStatesByCountryName = (countryName: string): IState[] => {
  const country = findCountryByName(countryName);
  if (!country) return [];
  return State.getStatesOfCountry(country.isoCode);
};

export const findStateByName = (countryName: string, stateName: string): IState | undefined => {
  const normalizedState = normalize(stateName);
  if (!normalizedState) return undefined;
  const states = getStatesByCountryName(countryName);
  return states.find((state) => normalize(state.name) === normalizedState);
};

export const getCitiesByCountryAndStateName = (countryName: string, stateName: string): ICity[] => {
  const country = findCountryByName(countryName);
  const state = findStateByName(countryName, stateName);
  if (!country || !state) return [];
  return City.getCitiesOfState(country.isoCode, state.isoCode);
};
