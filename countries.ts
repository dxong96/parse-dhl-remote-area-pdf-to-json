import axios from "axios";
import {countriesStateCityUrl} from "./config.js";
interface Country {
  id: number
  name: string
  iso3: string
  iso2: string
  numeric_code: string
  phone_code: string
  capital: string
  currency: string
  currency_name: string
  currency_symbol: string
  tld: string
  native: string
  region: string
  region_id: string
  subregion: string
  subregion_id: string
  nationality: string
  timezones: Timezone[]
  translations: Translations
  latitude: string
  longitude: string
  emoji: string
  emojiU: string
  states: State[]
}

interface Timezone {
  zoneName: string
  gmtOffset: number
  gmtOffsetName: string
  abbreviation: string
  tzName: string
}

interface Translations {
  kr: string
  "pt-BR": string
  pt: string
  nl: string
  hr: string
  fa: string
  de: string
  es: string
  fr: string
  ja: string
  it: string
  cn: string
  tr: string
}

interface State {
  id: number
  name: string
  state_code: string
  latitude: string
  longitude: string
  type: any
  cities: City[]
}

interface City {
  id: number
  name: string
  latitude: string
  longitude: string
}

const countries = await axios.get<Country[]>(countriesStateCityUrl)
  .then(res => res.data);

const _stateNames = new Set<string>();
const _cityNames = new Set<string>();

for (const country of countries) {
  if (country.states.length === 0) {
    continue;
  }

  for (const state of country.states) {
    _stateNames.add(state.name.toLowerCase());

    if (state.cities.length === 0) {
      continue;
    }

    for (const city of state.cities) {
      _cityNames.add(city.name.toLowerCase());
    }
  }
}

export const stateNames = _stateNames;
export const cityNames = _cityNames;