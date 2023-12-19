export interface State {
  dhlPdfEtag: string;
  countriesEtag: string;
}

export interface RemoteAreaItem {
  country: string;
  cityOrState?: string;
  zipRange?: string[];
  zip?: string;
}