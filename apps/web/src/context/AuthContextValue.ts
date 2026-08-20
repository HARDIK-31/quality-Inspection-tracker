import { createContext } from 'react';
import type { AuthUser } from '../lib/types';

export interface AuthContextValue {
  user: AuthUser | null;
  isReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
