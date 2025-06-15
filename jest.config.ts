import {type Config} from "jest";

export default {
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    '^.+\\.tsx?$': ["ts-jest", {tsconfig: "tsconfig.test.json", useESM: true}],
  },
  moduleNameMapper: {
    '(.+)\\.js': '$1'
  },
  roots: [ "<rootDir>/tests/"]
} satisfies Config;