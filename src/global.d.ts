export interface ProviderEnv {
  id: string;
  name: string;
  env: Record<string, string>;
  apiKey?: string;
}

export interface IpcRenderer {
  invoke(channel: string, ...args: any[]): Promise<any>;
  send(channel: string, ...args: any[]): void;
  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  off(channel: string, ...args: any[]): void;
}

declare global {
  interface Window {
    ipcRenderer: IpcRenderer;
  }
}
