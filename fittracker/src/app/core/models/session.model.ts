export interface CachedSession {
  id?: number;
  uid: string;
  email: string;
  displayName?: string;
  hashedSecret: string;
  lastLoginAt: string;
}

export interface ActiveSession {
  uid: string;
  email: string;
  displayName?: string;
  lastLoginAt: string;
  offlineCapable: boolean;
}
