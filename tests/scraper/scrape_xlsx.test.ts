import fs from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { downloadAndParseXlsx } from "../../src/scraper/scrape_xlsx.js";
import { RemoteAreaItem } from "../../src/types.js";
import { findLongestPrefix, isNumeric } from "../../src/utils.js";
import { countryMap } from "../../src/scraper/countries.js";

const OUTPUT_FILE_NAME = "tests/output2.json";
const STATE_FILE_NAME = "tests/state2.json";
const LOCAL_XLSX = "dhl-express-remote-area-surcharge-locations.xlsx";

describe("xlsx scraper", () => {
  beforeAll(async () => {
    fs.rmSync(OUTPUT_FILE_NAME, { force: true });
    fs.rmSync(STATE_FILE_NAME, { force: true });

    await downloadAndParseXlsx({
      outputFileName: OUTPUT_FILE_NAME,
      stateFileName: STATE_FILE_NAME,
    });
  }, 60000);

  afterAll(() => {
    fs.rmSync(OUTPUT_FILE_NAME, { force: true });
    fs.rmSync(STATE_FILE_NAME, { force: true });
  });

  test("should write to output2.json", () => {
    expect(() => fs.accessSync(OUTPUT_FILE_NAME)).not.toThrow();
  });
  test("should write to state2.json", () => {
    expect(() => fs.accessSync(STATE_FILE_NAME)).not.toThrow();
  });

  test("output2.json should have the correct shape", () => {
    const outputSchema = z.array(
      z.object({
        country: z.string(),
        iso: z.string().nullable(),
        cityOrState: z.string().optional(),
        zipRange: z.array(z.string()).optional(),
        zip: z.string().optional(),
      })
    );
    const result = outputSchema.safeParse(
      JSON.parse(fs.readFileSync(OUTPUT_FILE_NAME, "utf8"))
    );
    expect(result.success).toEqual(true);
  });

  test("state2.json should have the correct shape", () => {
    const stateSchema = z.object({
      sourceFileHash: z.string(),
      countriesHash: z.string(),
    });
    const result = stateSchema.safeParse(
      JSON.parse(fs.readFileSync(STATE_FILE_NAME, "utf8"))
    );
    expect(result.success).toEqual(true);
  });

  describe("output2.json content", () => {
    let remoteAreas: RemoteAreaItem[] = [];
    beforeAll(() => {
      remoteAreas = JSON.parse(fs.readFileSync(OUTPUT_FILE_NAME, "utf8"));
    });

    test("contains entries with zip, zipRange, and cityOrState", () => {
      const hasZip = remoteAreas.some((r) => typeof r.zip === "string");
      const hasZipRange = remoteAreas.some((r) => Array.isArray(r.zipRange));
      const hasCityOrState = remoteAreas.some(
        (r) => typeof r.cityOrState === "string"
      );
      expect(hasZip || hasZipRange || hasCityOrState).toBe(true);
      // Expect at least two of the three categories to exist to ensure diversity
      const categories = [hasZip, hasZipRange, hasCityOrState].filter(Boolean)
        .length;
      expect(categories).toBeGreaterThanOrEqual(2);
    });

    test("no item has both zip and zipRange", () => {
      const bad = remoteAreas.find((r) => r.zip && r.zipRange);
      expect(bad).toBeUndefined();
    });

    test("all zip ranges are iterable/valid", () => {
      let hasInvalidZipRange = false;
      for (const remoteArea of remoteAreas) {
        if (!remoteArea.zipRange) continue;

        const [a, b] = remoteArea.zipRange;
        if (isNumeric(a) && isNumeric(b)) continue;

        const prefix = findLongestPrefix(remoteArea.zipRange);
        if (prefix) {
          const aPost = a.substring(prefix.length);
          const bPost = b.substring(prefix.length);
          if (isNumeric(aPost) && isNumeric(bPost)) continue;
        }

        hasInvalidZipRange = true;
        // eslint-disable-next-line no-console
        console.warn("zip range is invalid", remoteArea.zipRange);
      }

      expect(hasInvalidZipRange).toBe(false);
    });
  });

  describe("state2.json content", () => {
    test("hashes are computed from inputs", () => {
      const state = JSON.parse(fs.readFileSync(STATE_FILE_NAME, "utf8"));
      const xlsxBuf = fs.readFileSync(LOCAL_XLSX);
      const expectedSource = createHash("sha256").update(xlsxBuf).digest("hex");
      const expectedCountries = createHash("sha256")
        .update(JSON.stringify(countryMap))
        .digest("hex");

      expect(state.sourceFileHash).toBe(expectedSource);
      expect(state.countriesHash).toBe(expectedCountries);
    });
  });
});
