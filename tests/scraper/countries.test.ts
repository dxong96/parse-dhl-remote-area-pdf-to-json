import {cityNames, stateNames} from "../../src/scraper/countries.js";

test("export stateNames to be present", () => {
  expect(stateNames.size).toBeGreaterThan(0);
});

test("export cityNames to be present", () => {
  expect(cityNames.size).toBeGreaterThan(0);
});