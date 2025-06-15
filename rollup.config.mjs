// rollup.config.mjs
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import {dts} from "rollup-plugin-dts";

export default  [
    {
        input: 'src/index.ts',
        output: [
            { file: 'build/index.cjs', format: 'cjs' },
            { file: 'build/index.mjs', format: 'es' }
        ],
        plugins: [
            typescript(),
            json()
        ],
    },
    {
        // path to your declaration files root
        input: './build/dts/src/index.d.ts',
        output: [{ file: 'build/index.d.ts', format: 'es' }],
        plugins: [dts()],
    },
];