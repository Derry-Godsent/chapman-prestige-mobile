# Profile and Session Follow-up

The Profile tab already uses a `ScrollView`, but it has no explicit full-height scroll style. The shared `AppScreen` is correctly full-height, so the Profile scroll container must be made flexible within that screen.

The app must preserve the verified Supabase session between launches. The session storage must keep sensitive tokens small enough for encrypted device storage, while ordinary profile and preference data remains separate.

## Confirmed causes

The splash route always sends every launch to onboarding, even when Supabase has a valid session. In addition, the complete Supabase session is currently stored as one encrypted value, which exceeds the platform's practical encrypted-storage size limit. The fix is to retain the encrypted session in small secure parts and to let the splash route choose the main tabs for a verified returning user or a returning guest.
