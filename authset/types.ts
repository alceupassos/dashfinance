export type Screen = 'home' | 'vault' | 'assistant' | 'settings' | 'onboarding' | 'add-code' | 'suggest-password' | 'password-health' | 'splash' | 'biometric-lock';

export type PasswordStrength = 'Fraca' | 'Média' | 'Forte' | 'Muito Forte' | '';

export interface Account {
  id: string;
  issuer: string;
  user: string;
  secret: string;
  tags: string[];
}

export interface VaultItem {
  id: string;
  service: string;
  username: string;
  password?: string;
  notes?: string;
  strength: PasswordStrength;
  category?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
