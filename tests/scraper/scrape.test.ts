import fs from "node:fs";
import {z} from "zod";
import {RemoteAreaItem} from "../../src/types.js";
import {downloadAndParsePdf} from "../../src/scraper/scrape.js";

const OUTPUT_FILE_NAME = "tests/output.json";
const STATE_FILE_NAME = "tests/state.json";

describe("scraper", () => {
  beforeAll(async () => {
    fs.rmSync(OUTPUT_FILE_NAME, { force: true });
    fs.rmSync(STATE_FILE_NAME, { force: true });

    await downloadAndParsePdf({
      outputFileName: OUTPUT_FILE_NAME,
      stateFileName: STATE_FILE_NAME,
    });
  }, 60000);

  afterAll(() => {
    fs.rmSync(OUTPUT_FILE_NAME, { force: true });
    fs.rmSync(STATE_FILE_NAME, { force: true });
  });

  test("should write to output.json", () => {
    expect(() => fs.accessSync(OUTPUT_FILE_NAME)).not.toThrow();
  });
  test("should write to state.json", () => {
    expect(() => fs.accessSync(STATE_FILE_NAME)).not.toThrow();
  });

  test("output.json should have the correct shape", () => {
    const outputSchema = z.array(
      z.object({
        country: z.string(),
        iso: z.string().nullable(),
        cityOrState: z.string().optional(),
        zipRange: z.array(z.string()).optional(),
        zip: z.string().optional()
      })
    );
    const result = outputSchema.safeParse(JSON.parse(fs.readFileSync(OUTPUT_FILE_NAME, "utf8")));
    expect(result.success).toEqual(true);
  });

  test("state.json should have the correct shape", () => {
    const stateSchema = z.object({
      dhlPdfEtag: z.string(),
      countriesEtag: z.string(),
    });
    const result = stateSchema.safeParse(JSON.parse(fs.readFileSync(STATE_FILE_NAME, "utf8")));
    expect(result.success).toEqual(true);
  });

  describe("output.json content", () => {
    let remoteAreas: RemoteAreaItem[] = [];
    beforeAll(() => {
      remoteAreas = JSON.parse(fs.readFileSync(OUTPUT_FILE_NAME, "utf8"));
    });

    test("support for non-number characters for zip and zipRange", () => {
      expect(remoteAreas).toEqual(expect.arrayContaining(
        [
          expect.objectContaining({
            country: "PORTUGAL",
            zip: "2000-005"
          } satisfies Partial<RemoteAreaItem>),
          expect.objectContaining({
            country: "PORTUGAL",
            zipRange: ["2000-010", "2000-011"]
          } satisfies Partial<RemoteAreaItem>),
          expect.objectContaining({
            country: "CANADA",
            zip: "A0A 1A0"
          } satisfies Partial<RemoteAreaItem>)
        ],
      ));
    });

    test("correctly parse cities and states", () => {
      expect(remoteAreas).toEqual(expect.arrayContaining(
        [
          expect.objectContaining({
            country: "NEPAL",
            cityOrState: "Tulsipur - Dang"
          } satisfies Partial<RemoteAreaItem>),
          expect.objectContaining({
            country: "NIGER",
            cityOrState: "Maradi"
          } satisfies Partial<RemoteAreaItem>),
        ],
      ));

    });
  });
});