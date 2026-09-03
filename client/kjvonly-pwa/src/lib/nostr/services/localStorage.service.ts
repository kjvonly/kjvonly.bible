
export const NOSTR_STORAGE_PREFIX = `${import.meta.env.VITE_NOSTR_STORAGE_PREFIX}`;
export class LocalStorage {


  public get(key: string): string | null {
    return localStorage.getItem(`${NOSTR_STORAGE_PREFIX}:${key}`);
  }

  public set(key: string, value: string): void {
    localStorage.setItem(`${NOSTR_STORAGE_PREFIX}:${key}`, value);
  }

  public remove(key: string): void {
    localStorage.removeItem(`${NOSTR_STORAGE_PREFIX}:${key}`);
  }


  public clear(): void {
    localStorage.clear();
  }
}

export let localStorageService = new LocalStorage()
