import type { VerificationMethod } from '../config/auth';
import { defaultVerificationMethod } from '../config/auth';
import { db } from './client';

type RegistrationResult = { session: boolean; verificationRequired: boolean };
const redirectTo = () => `${window.location.origin}/auth/callback`;

export const authService = {
  async login(email: string, password: string) {
    const { error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async registerEmail(email: string, password: string, name: string): Promise<RegistrationResult> {
    const { data, error } = await db().auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: redirectTo() } });
    if (error) throw error;
    return { session: Boolean(data.session), verificationRequired: !data.session };
  },
  async requestPhoneCode(phone: string, name: string) {
    const { error } = await db().auth.signInWithOtp({ phone, options: { shouldCreateUser: true, data: { display_name: name } } });
    if (error) throw error;
  },
  async requestEmailCode(email: string, name: string) {
    const { error } = await db().auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: { display_name: name }, emailRedirectTo: redirectTo() } });
    if (error) throw error;
  },
  async verifyCode(identifier: string, token: string, method: VerificationMethod) {
    const params = method === 'phone' ? { phone: identifier, token, type: 'sms' as const } : { email: identifier, token, type: 'email' as const };
    const { error } = await db().auth.verifyOtp(params);
    if (error) throw error;
  },
  async resendCode(identifier: string, name: string, method: VerificationMethod) {
    if (method === 'phone') return this.requestPhoneCode(identifier, name);
    return this.requestEmailCode(identifier, name);
  },
  defaultVerificationMethod,
  async logout() {
    const { error } = await db().auth.signOut();
    if (error) throw error;
  },
};
