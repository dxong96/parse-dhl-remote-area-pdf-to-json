export interface State {
  sourceFileHash: string;
  countriesHash: string;
}

export interface RemoteAreaItem {
  country: string;
  iso: string | null;
  cityOrState?: string;
  zipRange?: string[];
  zip?: string;
}