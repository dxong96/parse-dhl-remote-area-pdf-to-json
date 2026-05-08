import {writeFileSync, readFileSync} from "fs";
import {createHash} from "crypto";
import esMain from "es-main";
import XLSX from "xlsx";
import axios from "axios";
import countries from "i18n-iso-countries";
import {RemoteAreaItem, State} from "../types.js";
import {findLongestPrefix, isNumeric} from "../utils.js";
import {countryMap, countryNames} from "./countries.js";
import {dhlXlsxUrl} from "./config.js";

interface LogConfig {
  logRow?: boolean;
  logOutput?: boolean;
  logUnmappedCountry?: boolean;
}

interface DownloadAndParseXlsxOpts {
  logConfig?: LogConfig;
  outputFileName?: string;
  stateFileName?: string;
  // path to the local DHL XLSX file. If omitted, the file will be downloaded from xlsxUrl
  xlsxPath?: string;
  // URL to download the DHL XLSX from when xlsxPath is not provided
  xlsxUrl?: string;
}

// local iso2 fallback mapping copied from PDF scraper
const fallbackMapping: Record<string, string> = {
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
  'UNITED STATES, USA': 'US',
  'ANTIGUA': 'AG',
  'BOSNIA & HERZEGOVINA': 'BA',
  'CONGO, THE DEM. REP. OF': 'CD',
  'IRAN (ISLAMIC REP.  OF)': 'IR',
  'KOREA, REP. OF (S.  K.)': 'KR',
  'TAHITI': 'PF'
};

function toStringSafe(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function getIso2(countryName: string): string | null {
  // Try exact first, then uppercase variant for fallback mapping
  const iso = countries.getAlpha2Code(countryName, "en")
    ?? fallbackMapping[countryName.trim().toUpperCase()] 
    ?? null;
  return iso;
}

function isZipRangeValid(zipRange: string[]): boolean {
  if (zipRange.length !== 2) return false;
  const [a, b] = zipRange;
  if (isNumeric(a) && isNumeric(b)) return true;
  const prefix = findLongestPrefix(zipRange);
  if (prefix) {
    const aPost = a.substring(prefix.length);
    const bPost = b.substring(prefix.length);
    if (isNumeric(aPost) && isNumeric(bPost)) return true;
  }
  return false;
}

export async function downloadAndParseXlsx({ logConfig = {}, outputFileName = "output2.json", stateFileName = "state2.json", xlsxPath, xlsxUrl = dhlXlsxUrl }: DownloadAndParseXlsxOpts): Promise<void> {
  // Load XLSX either from local path or by downloading from URL
  let xlsxBuf: Buffer;
  if (xlsxPath) {
    xlsxBuf = readFileSync(xlsxPath);
  } else {
    const resp = await axios.get<ArrayBuffer>(xlsxUrl!, { responseType: "arraybuffer" });
    xlsxBuf = Buffer.from(resp.data);
  }
  const wb = XLSX.read(xlsxBuf, { type: "buffer" });
  const sheetName = wb.SheetNames[1];
  const ws = wb.Sheets[sheetName];
  // Read rows as 2D array to access fixed index columns
  const rowsAsLists: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: undefined }) as unknown[][];

  // Find the first relevant row. We assume the data starts where the first column is a known country name
  const firstRowIndex = rowsAsLists.findIndex(r => {
    return Array.isArray(r) && countryNames.has(String(r[0] ?? '').trim().toLowerCase())
  });
  const relevantRows = firstRowIndex >= 0 ? rowsAsLists.slice(firstRowIndex) : rowsAsLists;

  const out: RemoteAreaItem[] = [];

  for (const r of relevantRows) {
    if (!Array.isArray(r)) continue;
    // don't stop when country is missing iso is likely to be present
    let country = toStringSafe(r[0]); // "Country or Territory Name"

    const isoFromFile = toStringSafe(r[1]); // "Country or Territory Code"
    const iso = isoFromFile?.toUpperCase() || getIso2(country);
    if (!iso && logConfig.logUnmappedCountry) {
      console.warn("Unmapped country:", country);
      continue;
    }
    if (!country) {
      country = countryMap[iso].name
    }

    const cityOrState = toStringSafe(r[2]); // "City Name"
    const from = toStringSafe(r[3]); // "Postal Code, from"
    const to = toStringSafe(r[4]);   // "Postal Code, to"

    if (logConfig.logRow) console.log({ country, iso, cityOrState, from, to });

    if (from && to) {
      // If both bounds are provided and equal, store single zip instead of a range
      if (from === to) {
        out.push({ country, iso, zip: from });
        continue;
      }
      const range = [from, to];
      if (isZipRangeValid(range)) {
        out.push({ country, iso, zipRange: range });
      } else if (cityOrState) {
        // treat as city/state if range invalid
        out.push({ country, iso, cityOrState });
      }
      continue;
    }

    if (cityOrState) {
      out.push({ country, iso, cityOrState });
    }
  }

  const sourceHash = createHash('sha256').update(xlsxBuf).digest('hex');
  const countriesHash = createHash('sha256').update(JSON.stringify(countryMap)).digest('hex');

  const state: State = { sourceFileHash: sourceHash, countriesHash: countriesHash };
  writeFileSync(stateFileName, JSON.stringify(state), { encoding: "utf8" });
  writeFileSync(outputFileName, JSON.stringify(out), { encoding: "utf8" });
  if (logConfig.logOutput) console.log(JSON.stringify(out));
}

if (esMain(import.meta)) {
  await downloadAndParseXlsx({});
}
