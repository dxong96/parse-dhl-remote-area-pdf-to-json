import {jest} from "@jest/globals";

const mockRemoteAreaItems: RemoteAreaItem[] = [
  {"country":"CHILE","iso":"CL","cityOrState":"Yumbel"},
  {"country":"CHINA, PEOPLE’S REP.","iso":"CN","zip":"015000"},
  {"country":"ITALY","iso":"IT","zipRange":["00027","00028"]},
  {"country":"CANADA","iso":"CA","zipRange":["A0A 3X0","A0A 3X1"]}
];

jest.unstable_mockModule('../output.json', () => ({
  default: mockRemoteAreaItems
}), { virtual: true });

const {remoteAreas, isRemoteArea, isZipRemoteArea, isCityOrStateRemoteArea} = await import("../src/index.js");
import {RemoteAreaItem} from "../src/types.js";



test('should use mocked settings', () => {
  // Now settings will be the mocked value
  expect(remoteAreas).toBe(mockRemoteAreaItems);
  // Your test code here
});

test("isRemoteArea() should be able to accept either zip, zip range, city or state", () => {
  // zip
  expect(isRemoteArea("CN", "015000")).toBe(true);
  expect(isRemoteArea("CN", "15000")).toBe(false);
  // zip range
  expect(isRemoteArea("IT", "00027")).toBe(true);
  expect(isRemoteArea("IT", "00028")).toBe(true);
  expect(isRemoteArea("IT", "0028")).toBe(false);

  expect(isRemoteArea("CA", "A0A 3X0")).toBe(true);
  // city and state
  expect(isRemoteArea("CL", "Yumbel")).toBe(true);
  expect(isRemoteArea("CL", "Yumbe")).toBe(false);
});

test("isZipRemoteArea() should be able to accept either zip or zip range", () => {
  // zip
  expect(isZipRemoteArea("CN", "015000")).toBe(true);
  expect(isZipRemoteArea("CN", "15000")).toBe(false);
  // zip range
  expect(isZipRemoteArea("IT", "00027")).toBe(true);
  expect(isZipRemoteArea("IT", "00028")).toBe(true);
  expect(isZipRemoteArea("IT", "0028")).toBe(false);

  expect(isZipRemoteArea("CA", "A0A 3X0")).toBe(true);

  // city and state
  expect(isZipRemoteArea("CL", "Yumbel")).toBe(false);
});

test("isCityOrStateRemoteArea() should be able to accept either city or state only", () => {
  // zip
  expect(isCityOrStateRemoteArea("CN", "015000")).toBe(false);
  expect(isCityOrStateRemoteArea("CN", "15000")).toBe(false);
  // zip range
  expect(isCityOrStateRemoteArea("IT", "00027")).toBe(false);
  expect(isCityOrStateRemoteArea("IT", "00028")).toBe(false);
  expect(isCityOrStateRemoteArea("IT", "0028")).toBe(false);

  expect(isCityOrStateRemoteArea("CA", "A0A 3X0")).toBe(false);

  // city and state
  expect(isCityOrStateRemoteArea("CL", "Yumbel")).toBe(true);
});