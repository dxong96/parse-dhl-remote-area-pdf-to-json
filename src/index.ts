import {Readable} from "stream";
import {createWriteStream, writeFileSync} from "fs";
import {readFile} from "fs/promises";
import axios from "axios";
import {countriesStateCityUrl, dhlPdfUrl} from "./config.js";
import {PdfReader} from "pdfreader";
import {cityNames, stateNames} from "./countries.js";
import {RemoteAreaItem, State} from "../types.js";
import countries from "i18n-iso-countries";

// interfaces
interface CurrentCountry {
  country: string;
  iso: string | null;
}

// log config
const logConfig = {
  logCountryHeader: false,
  logPage: true,
  logUnmappedCountry: true,
  logMatchCity: true,
  logMatchState: true,
  logMatchZipRange: true,
  logMatchNoDigit: true,
  logMatchNone: true,
  logCurrentCell: false,
  logOutput: false
}

// patterns
const textBlacklistUnderCountryHeader = [
  /Effective date:/,
  /^\s*$/
];
const rangeZipPattern = /([A-Z0-9 ]+) +- +([A-Z0-9 ]+)/;

// state
let foundRemoteCountryHeader = false;
let currentCountry: CurrentCountry = {
  iso: null,
  country: ''
};
let previousItemIsRemoteAreaListLabel = false;

// local iso2 mapping
const fallbackMapping = {
  'BOSNIA &  HERZEGOVINA': 'BA',
  'BRUNEI': 'BN',
  'CANARY ISLANDS, THE': 'IC',
  'CHINA, PEOPLE’S REP.': 'CN',
  'CONGO, DEM. REP. OF': 'CD',
  'COTE D’IVOIRE': 'CI',
  'CZECH REPUBLIC, THE': 'CZ',
  'FRENCH GUYANA': 'GF',
  'GUINEA REPUBLIC': 'GN',
  'GUINEA-EQUATORIAL': 'GQ',
  'GUYANA (BRITISH)': 'GY',
  'IRAN (ISLAMIC REP. OF)': 'IR',
  'IRELAND, REPUBLIC OF': 'IE',
  'KOREA, REP. OF (S. K.)': 'KR',
  'KOREA, D.P.R OF (N. K.)': 'KP',
  'LAO PEOPLE’S DEM. REP.': 'LA',
  'MONTENEGRO, REP. OF': 'ME',
  'PHILIPPINES, THE': 'PH',
  'RUSSIAN FED., THE': 'RU',
  'SERBIA, REPUBLIC OF': 'RS',
  'ST. VINCENT': 'VC',
  'SWAZILAND': 'SZ',
  'SYRIA': 'SY',
  'TIMOR LESTE': 'TL',
  'TAIWAN, CHINA': 'TW',
  'TÜRKİYE': 'TR',
  'TURKS & CAICOS ISLNDS.': 'TC',
  'UNITED STATES, USA': 'US'
};

// output
const output: RemoteAreaItem[] = [];

let state: State = {
  dhlPdfEtag: "",
  countriesEtag: ""
};
try {
  state = JSON.parse(await readFile('state.json', {encoding: 'utf8'}));
} catch (e) {
  console.log('failed to parse existing state');
}

const dhlPdfEtag = await axios.head(dhlPdfUrl)
  .then(res => {
    return res.headers["etag"] as string;
  });
const countriesPdfEtag = await axios.head(countriesStateCityUrl)
  .then(res => {
    return res.headers["etag"] as string;
  });
const dhlPdfChanged = true;
// const dhlPdfChanged = state.dhlPdfEtag !== dhlPdfEtag;
const countriesPdfChanged = state.countriesEtag !== countriesPdfEtag;
const shouldRun = dhlPdfChanged || countriesPdfChanged;

console.log('dhlPdfEtag', dhlPdfEtag);
console.log('countriesPdfEtag', countriesPdfEtag);
console.log('dhlPdfChanged', dhlPdfChanged);
console.log('countriesPdfChanged', countriesPdfChanged);
console.log('shouldRun', shouldRun);

if (shouldRun) {
  await new Promise<void>((resolve, reject) => {
    axios.get<Readable>(dhlPdfUrl, {
      responseType: 'stream',
      headers: {
        "User-Agent": 'curl/8.4.0'
      }
    })
      .then(res => {
        const writable = createWriteStream('dhl_express_remote_areas_en.pdf');
        res.data.pipe(writable);
        writable.on('finish', () => {
          console.log('pipe finished');
          resolve();
        });
      })
      .catch(e => {
        console.error(e);
        reject(e);
      });
  });
  new PdfReader({}).parseFileItems("dhl_express_remote_areas_en.pdf", (err, item) => {
    if (err) {
      console.error("error:", err);
    } else if (!item) {
      console.warn("end of file");
      const newState: State = {
        countriesEtag: countriesPdfEtag,
        dhlPdfEtag: dhlPdfEtag
      };
      writeFileSync("state.json", JSON.stringify(newState), {encoding: 'utf8'});
      writeFileSync("output.json", JSON.stringify(output), {encoding: 'utf8'});
      logConfig.logOutput && console.log(JSON.stringify(output));
    } else if (item.page) {
      foundRemoteCountryHeader = false;
      logConfig.logPage && console.log('page:', item.page);
    }
    else if (item.text) {
      if (item.text.includes('REMOTE AREA BY COUNTRY')) {
        foundRemoteCountryHeader = true;
        // do not process the header
        return;
      }

      if (foundRemoteCountryHeader) {
        if (textBlacklistUnderCountryHeader.some(pattern => pattern.test(item.text))) {
          // skip line
          return;
        }

        if (/Remote Area List/.test(item.text)) {
          previousItemIsRemoteAreaListLabel = true;
          return;
        }

        if (previousItemIsRemoteAreaListLabel && /\d/.test(item.text)) {
          // skip page number text
          return;
        }

        if (!/\d/.test(item.text) && item.text === item.text.toUpperCase()) {
          const iso = countries.getAlpha2Code(item.text, "en")
            ?? fallbackMapping[item.text.trim()]
            ?? null;
          currentCountry = {
            country: item.text,
            iso
          };
          logConfig.logCountryHeader && console.log(`currentCountry map: ${item.text} to ${iso}`);
          if (!iso) {
            logConfig.logUnmappedCountry && console.log(`currentCountry not mapped: ${item.text}`);
          }
          // do not process the country
          return;
        }

        if (cityNames.has(item.text.trim().toLowerCase())) {
          logConfig.logMatchCity&& console.log('match city name', item.text);
          output.push({
            ...currentCountry,
            cityOrState: item.text.trim()
          });
        } else if (stateNames.has(item.text.trim().toLowerCase())) {
          logConfig.logMatchState && console.log('match state name', item.text);
          output.push({
            ...currentCountry,
            cityOrState: item.text.trim()
          });
        } else if (rangeZipPattern.test(item.text)) {
          logConfig.logMatchZipRange && console.log('match zip range', item.text);
          const matches = rangeZipPattern.exec(item.text);
          output.push({
            ...currentCountry,
            zipRange: matches.slice(1, 3)
          });
        } else if (!/\d/.test(item.text)) {
          logConfig.logMatchNoDigit && console.log('no digit found, likely city or state', item.text);
          output.push({
            ...currentCountry,
            cityOrState: item.text.trim()
          });
        } else {
          logConfig.logMatchNone && console.log('no match found, assign to zip', item.text);
          output.push({
            ...currentCountry,
            zip: item.text.trim()
          });
        }
      }
      previousItemIsRemoteAreaListLabel = false;
      logConfig.logCurrentCell && console.log('text:', item.text);
    }
  });
}