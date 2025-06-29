// rollup.config.mjs
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import {dts} from "rollup-plugin-dts";
import commonjs from "@rollup/plugin-commonjs";

export default  [
    {
        input: 'src/index.ts',
        output: [
            { file: 'build/index.cjs', format: 'cjs' },
        ],
        plugins: [
            commonjs(),
            typescript(),
            json()
        ],
    },
    {
        input: 'src/index.ts',
        output: [
            { file: 'build/index.mjs', format: 'es' }
        ],
        plugins: [
            typescript(),
            json()
        ],
    },
    {
        // path to your declaration files root
        input: './build/types/mjs/src/index.d.ts',
        output: [
            { file: 'build/index.d.mts', format: 'es' },
            { file: 'build/index.d.cts', format: 'cjs' }
        ],
        plugins: [dts()],
    }
];
