# Phone SMS Verification Readiness

## Current position

The mobile app already has the customer phone-number and six-digit-code screens. Its implementation uses Ghana E.164 phone values such as `+233XXXXXXXXX` and the standard Supabase send-code and verify-code flow.

The hosted Supabase Phone Auth provider setting is accessible in the authorised Supabase Dashboard. Phone login is currently **disabled**. Its configuration panel currently selects Twilio and has no sender credentials saved. No Phone Auth or SMS provider setting has been changed during this review.

## Required configuration before real SMS can work

1. Create or use an account with one supported SMS provider. The available options shown in this project are Twilio, MessageBird, Textlocal, Vonage, Twilio Verify, and Twilio.
2. In Supabase **Authentication → Providers → Phone**, choose that provider and enter its details directly in the dashboard.
3. Enable **Phone** under Supabase **Authentication → Providers**.
4. Keep the provider account credential private; do not put it in the mobile app, GitHub, or chat.
5. Send a single Ghana-format test number an OTP and verify the six-digit code in the mobile app.

## Safety boundary

Phone verification can be prepared independently, but live customer profile and order access remains off until the reviewed customer-account security migration is applied and staff access is tested. This prevents a newly verified customer from accessing broad development-era database permissions.

## Arkesel connection status

The `send-sms-arkesel` Edge Function is deployed to the shared Supabase project. It remains inactive until the Arkesel API key, sender ID, and Supabase Send SMS Hook signing secret are added privately in the Supabase Dashboard and the Auth Hook is enabled. The phone provider is still disabled, so no customer SMS is being sent.

The Supabase Auth Hooks page confirms that **Send SMS Hook** is available on the current free plan. The creation form is open. It is initially set to a database-function option; the deployed Arkesel adapter requires the **HTTPS** option. No hook configuration has been saved yet.

The HTTPS function route and a generated signing secret are now present in the form. The Send SMS Hook is now active. Phone login remains a separate setting and has not been enabled as part of creating the hook.

Supabase now confirms that the Send SMS Hook will be used instead of the native provider fields. The Phone provider itself is still shown as disabled and is ready for the separately approved activation.

The Phone provider switch has now been saved and the Supabase provider list confirms that Phone is enabled. The first test must use only a Chapman-controlled Ghana number. Customer profile and booking access remains blocked until the separate customer-account security migration is applied and staff access is tested.

## Controlled SMS test result

The first controlled sign-in request reached the deployed Arkesel Edge Function, but the function returned a 5xx error. No code was delivered. The next step is to inspect the function error log and correct the server-side adapter before another test.

The function log confirms the cause: the available Supabase secret is named `SEND_SMS_HOOK_SECRETS`, while the first function version looked for `SEND_SMS_HOOK_SECRET`. The private value was added correctly; only the name expected by the function was wrong. The safe correction is a code-only function update that uses the existing secret name. No secret value is recorded in this document.
