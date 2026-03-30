import Store from 'electron-store';

export interface ProviderEnv {
  id: string;
  name: string;
  env: Record<string, string>;
  apiKey?: string;
  readonly?: boolean;
  updatedAt?: string;
}

export interface AppConfig {
  providers: ProviderEnv[];
  activeProviderId: string | null;
}

const defaultProviders: ProviderEnv[] = [];

export const store = new Store<AppConfig>({
  defaults: {
    providers: defaultProviders,
    activeProviderId: null
  }
});
