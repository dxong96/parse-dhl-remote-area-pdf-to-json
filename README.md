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

## Installing

### Package manager

Using npm:

```bash
npm i parse-dhl-remote-area-pdf-to-json
```


## Usage

### ESM
```ecmascript 6
// Get exports
import {remoteAreas, isRemoteArea, isZipRemoteArea, isCityOrStateRemoteArea} from 'parse-dhl-remote-area-pdf-to-json';
```

### CommonJS

```js
const {remoteAreas, isRemoteArea, isZipRemoteArea, isCityOrStateRemoteArea} = require('parse-dhl-remote-area-pdf-to-json');
```

### remoteAreas - raw data from [output.json](https://github.com/dxong96/parse-dhl-remote-area-pdf-to-json/blob/master/output.json)

### isRemoteArea
```js
// required parameters country iso 2-code and zip/state/city
isRemoteArea("CN", "015000");
```

### isZipRemoteArea
```js
// required parameters country iso 2-code and zip only
isZipRemoteArea("CN", "015000");
```

### isCityOrStateRemoteArea
```js
// required parameters country iso 2-code and city/state only
isCityOrStateRemoteArea("CL", "Yumbel")
```