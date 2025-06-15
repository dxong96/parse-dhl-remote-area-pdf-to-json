export interface State {
  dhlPdfEtag: string;
  countriesEtag: string;
}

export interface RemoteAreaItem {
  country: string;
  iso: string | null;
  cityOrState?: string;
  zipRange?: string[];
  zip?: string;
}