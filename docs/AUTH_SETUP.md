# Email-code accounts and admin access

TR: Giriş ekranı ve Supabase bağlantı kodu hazırdır; canlı üyelik, Supabase ve SMTP yapılandırılana kadar kapalıdır. İlk yönetici adresi kullanıcı tarafından belirlenmiştir; tarayıcı kodunda e-posta karşılaştırmasıyla yönetici yetkisi verilmez. Gerçek alım-satım henüz yoktur. Bu işlemler eklendiğinde doğrulanmış hesap kontrolü sunucuda zorunlu olmalıdır.

EN: The sign-in UI and Supabase integration code are ready; live membership stays disabled until Supabase and SMTP are configured. The initial admin address is selected by the owner; comparing an email address in browser code never grants admin rights. Actual buying/selling is not implemented. Future transaction endpoints must enforce verified accounts on the server.

NL: De aanmeldinterface en Supabase-integratiecode zijn klaar; registratie blijft uitgeschakeld totdat Supabase en SMTP zijn ingesteld. De eigenaar kiest het eerste beheerdersadres; een e-mailvergelijking in browsercode geeft nooit beheerdersrechten. Echt kopen/verkopen is niet geïmplementeerd. Toekomstige transactie-endpoints moeten geverifieerde accounts op de server verplichten.

## Owner setup

1. Create/connect a Supabase account and a Free project, preferably in an EU region. Do not enable a paid plan. No project has been created by this code.
2. Apply `supabase/migrations/202610190001_accounts.sql` once through Supabase's SQL editor or migration tooling. The migration creates a private admin-role table and server-checked access/statistics functions. Do not expose the `private` schema through the Data API.
3. Enable email authentication and disable anonymous sign-in. Set the Site URL to `https://zekitazegul.github.io/shopping-website-project/`. Use email-code templates containing `{{ .Token }}` for both signup confirmation and passwordless sign-in. Set OTP length to 6 and expiration to 600 seconds; keep resend rate limits enabled.
4. Configure a verified SMTP sender using credentials stored only in Supabase's protected settings. Supabase's default SMTP only sends to project-team email addresses and is unsuitable for general visitor signup. Do not commit credentials or put SMTP/service-role secrets in GitHub Variables or frontend code. No SMTP provider is configured yet.
5. Add repository Actions **Variables** `SUPABASE_URL` (HTTPS project URL) and `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`). These two values are intentionally public. The build rejects secret keys. Empty values keep signup safely disabled. For local development, set these environment variables, run the build, and serve `dist/` rather than changing the tracked placeholder configuration.
6. Trigger the Pages workflow. Validate an actual signup using the owner's mailbox: receive a code, reject an incorrect/expired code, verify a valid code once, sign out, and verify a normal account cannot call `admin_account_stats`. Local automated tests mock Supabase and do not prove real email delivery or live database grants.
7. After the owner has verified their email, assign only that account as admin through the SQL editor. Replace the example below with the owner-approved address, and check exactly one row is returned. No other user can execute this administrative SQL through the site.

```sql
insert into private.admin_users(user_id)
select id from auth.users
where lower(email) = lower('OWNER_APPROVED_EMAIL')
  and email_confirmed_at is not null
  and not is_anonymous
on conflict (user_id) do nothing
returning user_id;
```

8. Open the site's admin sign-in, verify with a new email code, and confirm account statistics appear. A normal member must receive an access-denied message, including when they alter user metadata or browser storage. Admin role removal is a server-side delete from `private.admin_users`.

## Session and transaction boundaries

- Access tokens are kept only in the current tab's session storage. OTPs and refresh tokens are never stored. After token expiry, sign in again with a new email code. Every account/admin access is validated against Supabase; editing local storage cannot grant privileges.
- The UI only shows aggregate admin statistics. It does not expose the auth user directory or grant role-management capabilities to visitors.
- No purchase, payment, listing-creation or seller-contact API currently exists. `public.has_verified_account()` is a server-side building block, not an implemented trade restriction by itself. Every future purchase/sale endpoint and database policy must require that function plus ownership/authorization checks; hiding buttons is insufficient.
- GitHub Pages currently hosts a demonstration. Before enabling actual commercial transactions, move to hosting permitted for that purpose. A new domain alone does not change hosting capabilities or usage terms.

References: [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp), [database security](https://supabase.com/docs/guides/database/postgres/row-level-security), [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
