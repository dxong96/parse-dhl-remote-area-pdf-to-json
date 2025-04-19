               # DHL remote area
`output.json` is the file that is converted from https://mydhl.express.dhl/content/dam/downloads/global/en/remote-areas/dhl_express_remote_areas_en.pdf.coredownload.pdf

The output is a list of the following interface.


```typescript
interface RemoteAreaItem {
  country: string;
  cityOrState?: string;
  zipRange?: string[];
  zip?: string;
}
```

Last generated on 20/12/2023 GMT+8

## Installing

### Package manager

Using npm:

```bash
npm i parse-dhl-remote-area-pdf-to-json
```


## Usage

### ESM
```ecmascript 6
import countries from 'parse-dhl-remote-area-pdf-to-json';
```

### CommonJS

```js
const countries = require('parse-dhl-remote-area-pdf-to-json');
```

## Releasing
```shell
git show master:output.json > index.json
echo "export default $(cat index.json);" > index.mjs
git add index.*
git commit -m "Update at $(date '+%d %b %Y')"
npm version patch
npm publish
```