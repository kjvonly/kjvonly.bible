
export const NOSTR_STORAGE_PREFIX = `${import.meta.env.VITE_NOSTR_STORAGE_PREFIX}`;
export class WebStorage {

  public constructor(private readonly storage: Storage) { }

  public get(key: string): string | null {
    return this.storage.getItem(`${NOSTR_STORAGE_PREFIX}:${key}`);
  }

  public set(key: string, value: string): void {
    this.storage.setItem(`${NOSTR_STORAGE_PREFIX}:${key}`, value);
  }

  public remove(key: string): void {
    this.storage.removeItem(`${NOSTR_STORAGE_PREFIX}:${key}`);
  }

  public clear(): void {
    this.storage.clear();
  }


}

