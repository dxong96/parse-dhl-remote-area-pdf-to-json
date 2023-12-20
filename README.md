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
