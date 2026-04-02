import { City, Country, State, type ICity, type ICountry, type IState } from 'country-state-city';

const normalize = (value: string) => String(value || '').trim().toLowerCase();

export const ALL_COUNTRIES: ICountry[] = Country.getAllCountries();

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
