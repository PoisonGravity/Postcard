# Authentication verification rollout

The frontend currently runs with `VITE_AUTH_VERIFICATION_MODE=off`. Registration uses email and password, and the UI does not start an OTP flow. The service layer already contains phone OTP, email OTP, verification, and resend methods for the next rollout.

To make password registration complete immediately, turn off **Authentication → Providers → Email → Confirm email** in the Supabase dashboard. This is a project-level setting and cannot be changed safely from browser code.

When the providers are ready, set these values in `.env.local` and rebuild:

```env
VITE_AUTH_VERIFICATION_MODE=auto
VITE_AUTH_PHONE_ENABLED=true
VITE_AUTH_EMAIL_ENABLED=true
```

The configured method order is phone first, then email. Phone OTP requires a Supabase phone provider and SMS provider. Email OTP requires the email provider, templates, and redirect URL configuration. Keep provider secrets and the Supabase service-role key out of frontend environment variables.
