import {Readable} from "stream";
import {writeFileSync, createWriteStream} from "fs";
import {readFile} from "fs/promises";
import axios from "axios";
import {countriesStateCityUrl, dhlPdfUrl} from "../config.js";
import {PdfReader} from "pdfreader";
import {cityNames, stateNames} from "../countries.js";

interface State {
  dhlPdfEtag: string;
  countriesEtag: string;
}

interface RemoteAreaItem {
  country: string;
  cityOrState?: string;
  zipRange?: string[];
  zip?: string;
}

// patterns
const textBlacklistUnderCountryHeader = [
  /Effective date:/,
  /^\s*$/
];
const rangeZipPattern = /([\d-]+) +- +([\d-]+)/;

// state
let foundRemoteCountryHeader = false;
let currentCountry = '';
let previousItemIsRemoteAreaListLabel = false;

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
const dhlPdfChanged = state.dhlPdfEtag !== dhlPdfEtag;
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
      console.log(JSON.stringify(output));
    } else if (item.page) {
      foundRemoteCountryHeader = false;
      console.log('page:', item.page);
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
          currentCountry = item.text;
          console.log('currentCountry:', item.text);
          // do not process the country
          return;
        }

        if (cityNames.has(item.text.trim().toLowerCase())) {
          console.log('match city name', item.text);
          output.push({
            country: currentCountry,
            cityOrState: item.text.trim()
          });
        } else if (stateNames.has(item.text.trim().toLowerCase())) {
          console.log('match state name', item.text);
          output.push({
            country: currentCountry,
            cityOrState: item.text.trim()
          });
        } else if (rangeZipPattern.test(item.text)) {
          console.log('match zip range', item.text);
          const matches = rangeZipPattern.exec(item.text);
          output.push({
            country: currentCountry,
            zipRange: matches.slice(1, 3)
          });
        } else if (!/\d/.test(item.text)) {
          console.log('no digit found, likely city or state', item.text);
          output.push({
            country: currentCountry,
            cityOrState: item.text.trim()
          });
        } else {
          console.log('no match found, assign to zip', item.text);
          output.push({
            country: currentCountry,
            zip: item.text.trim()
          });
        }
      }
      previousItemIsRemoteAreaListLabel = false;
      // console.log('text:', item.text);
    }
  });
}