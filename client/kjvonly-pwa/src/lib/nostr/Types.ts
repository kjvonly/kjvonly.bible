export type id = string;
export type pubkey = string;

export type Timeout = string | number;

export interface ChannelMetadata {
  name: string | undefined;
  about: string | undefined;
  picture: string | undefined;
}

export interface Event {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
  user: User | undefined;
}

export interface UserEvent extends Event {
  user: User;
}

export interface User {
  name: string;
  display_name: string;
  nip05: string;
  picture: string;
  banner: string;
  website: string;
  about: string;
  lud06: string;
  lud16: string;
  zapEndpoint: string | null;
}

