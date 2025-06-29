import remoteAreasObj from '../output.json';
import {groupBy} from "lodash-es";
import {findLongestPrefix, isNumeric} from "./utils.js";
import {RemoteAreaItem} from "./types.js";

interface Dataset {
  zipCodes: Set<string>;
  cityOrStates: Set<string>;
}

type DatasetByCountries = Record<string, Dataset>;

export const remoteAreas: RemoteAreaItem[] = remoteAreasObj as unknown as RemoteAreaItem[];

function initForCountry(areas: typeof remoteAreas): Dataset {
  const zipCodes = new Set<string>();
  const cityOrStates = new Set<string>();

  for (const area of areas) {
    if (area.zipRange) {
      const [start, end] = area.zipRange;
      if (isNumeric(start) && isNumeric(end)) {
        // Get the length of the ZIP code to maintain leading zeros
        const padLength = start.length;
        const startNum = parseInt(start, 10);
        const endNum = parseInt(end, 10);

        for (let i = startNum; i <= endNum; i++) {
          // Pad with leading zeros to maintain ZIP code format
          const zip = i.toString().padStart(padLength, "0");
          zipCodes.add(zip.toLowerCase());
        }
      } else {
        // take the similar prefix and increment
        const prefix = findLongestPrefix(area.zipRange);
        const [postfixStart, postfixEnd] = area.zipRange.map(zip => zip.substring(prefix.length));
        if (isNumeric(postfixStart) && isNumeric(postfixEnd)) {
          const startNum = parseInt(postfixStart, 10);
          const endNum = parseInt(postfixEnd, 10);
          const padLength = postfixStart.length;
          for (let i = startNum; i <= endNum; i++) {
            const zip = prefix + String(i).padStart(padLength, "0");
            zipCodes.add(zip.toLowerCase());
          }
        }
      }
      continue;
    }

    if (area.zip) {
      zipCodes.add(area.zip.toLowerCase());
      continue;
    }

    if (area.cityOrState) {
      cityOrStates.add(area.cityOrState.toLowerCase());
    }
  }

  return {
    zipCodes,
    cityOrStates
  };
}

function init() {
  const areasByCountries = groupBy(remoteAreas, item => item.iso);
  const result: DatasetByCountries = {};
  for (const countryCode in areasByCountries) {
    result[countryCode] = initForCountry(areasByCountries[countryCode]);
  }
  return result;
}

const datasetByCountries = init();


export const isRemoteArea = (countryCode: string, zipOrCityOrState: string): boolean => {
  return isZipRemoteArea(countryCode, zipOrCityOrState) || isCityOrStateRemoteArea(countryCode, zipOrCityOrState);
};

export const isZipRemoteArea = (countryCode: string, zip: string): boolean => {
  return !!datasetByCountries[countryCode]?.zipCodes.has(zip.toLowerCase());
};

export const isCityOrStateRemoteArea = (countryCode: string, cityOrState: string): boolean => {
  return !!datasetByCountries[countryCode]?.cityOrStates.has(cityOrState.toLowerCase());
};
