export type VerificationMethod = 'phone' | 'email';
export type VerificationMode = 'off' | 'auto' | VerificationMethod;

export const verificationMode = (import.meta.env.VITE_AUTH_VERIFICATION_MODE || 'off') as VerificationMode;
export const phoneVerificationEnabled = import.meta.env.VITE_AUTH_PHONE_ENABLED === 'true';
export const emailVerificationEnabled = import.meta.env.VITE_AUTH_EMAIL_ENABLED === 'true';

// Keep phone first so auto mode prefers SMS whenever both providers are enabled.
export const verificationMethods: VerificationMethod[] = [
  ...(phoneVerificationEnabled ? ['phone' as const] : []),
  ...(emailVerificationEnabled ? ['email' as const] : []),
];

export function defaultVerificationMethod(): VerificationMethod | null {
  return verificationMethods[0] ?? null;
}
