# Home-server accounts

TR: Üyelik artık ücretli bir hizmete veya Supabase'e bağlı değildir. Node.js + SQLite sunucusu ayrı bir Docker Compose projesidir. İlk yönetici adresi yerel gizli ayarda belirlenir; ancak o adrese gönderilen kod doğrulandıktan sonra yönetici yetkisi alınır. Yahoo uygulama parolası girilene kadar üyelik kapalıdır. Yerel adres: `http://127.0.0.1:4180`. GitHub'daki halka açık demo, HTTPS sunucu bağlantısı yapılana kadar üyelik kabul etmez.

EN: Accounts no longer depend on Supabase or a paid service. The Node.js + SQLite server runs in its own Docker Compose project. The initial administrator is selected in private server configuration; admin access requires verifying the code delivered to that address. Signup stays disabled until a Yahoo app password is configured. Local URL: `http://127.0.0.1:4180`. The public GitHub demo does not accept registrations until an HTTPS server connection is configured.

NL: Accounts zijn niet langer afhankelijk van Supabase of een betaalde dienst. De Node.js + SQLite-server draait in een eigen Docker Compose-project. De eerste beheerder wordt ingesteld in de privéconfiguratie; beheertoegang vereist verificatie van de code die naar dat adres wordt gestuurd. Registratie blijft uitgeschakeld totdat een Yahoo-appwachtwoord is ingesteld. Lokaal adres: `http://127.0.0.1:4180`. De openbare GitHub-demo accepteert geen registraties totdat een HTTPS-serververbinding is ingesteld.

## Local Docker setup

Run from this checkout using Docker Desktop's Linux engine:

```powershell
docker compose up -d --build
```

The service publishes only `127.0.0.1:4180`, uses a non-root container user, and restarts when Docker starts. The existing Nextcloud stack is separate and is not modified. Persistent data lives in three Docker volumes, outside OneDrive:

| Volume | Contents |
| --- | --- |
| `shopping-marketplace_accounts-data` | SQLite database, sessions, hashed codes, private server key |
| `shopping-marketplace_private-config` | Private SMTP and administrator settings |
| `shopping-marketplace_accounts-backups` | Consistent database backup snapshots |

TR: Docker Desktop kapalıysa veya bilgisayar uyuyorsa servis çalışmaz. Otomatik Windows başlangıç görevi kurulmadı.

EN: The service is unavailable while Docker Desktop is stopped or the PC is asleep. No Windows startup task has been installed.

NL: De dienst is niet beschikbaar wanneer Docker Desktop is gestopt of de pc slaapt. Er is geen Windows-opstarttaak geïnstalleerd.

## Yahoo configuration

1. In Yahoo Account Security, generate an **app password** for this application. Do not use your normal Yahoo password. Never paste the app password into chat, GitHub, an issue, or a public file.
2. Run the following locally in PowerShell. The application password is entered through a hidden prompt. The script saves `.server-config.json` with restricted Windows permissions, passes it to the container via stdin, and restarts only this service. Both the local file and Docker private volume contain sensitive credentials; neither is included in Git or the Docker image.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/setup-home-server.ps1
```

3. Enter the owner-approved administrator address, Yahoo sender address, and app password. The server uses `smtp.mail.yahoo.com:465` with TLS. A mailbox provider may enforce sending limits; real delivery has not yet been verified.
4. Open `http://127.0.0.1:4180`, request a code for the administrator address, and verify it. This creates the admin account only after mailbox verification. Verify with a second mailbox that normal members cannot open admin statistics. No real accounts have been created by automated tests.

TR: Kurulum komutu uygulama parolasını gizli sorar ve konteyneri yeniden başlatır. Parolayı sohbete yazma. İlk gerçek kod gönderimi bu ayardan sonra denenmelidir.

EN: The setup command prompts for the app password without displaying it and restarts the container. Do not send the password in chat. Test actual code delivery after configuration.

NL: Het installatiecommando vraagt het appwachtwoord zonder het te tonen en herstart de container. Deel het wachtwoord niet in de chat. Test echte codebezorging na de configuratie.

## Security and account behavior

- Codes are cryptographically generated, expire after 10 minutes, work once, and are stored only as keyed digests. Maximum five verification attempts per challenge; resend cooldown is 60 seconds. Persistent email/IP rate buckets limit requests without storing raw IP addresses.
- Only the server-selected email receives the initial admin role after code verification. Client-supplied roles, browser storage and query parameters cannot grant permissions.
- Sessions expire after 24 hours and are revoked server-side on logout. Session tokens are stored as keyed hashes in SQLite and as bearer tokens only in the current browser tab's session storage. Codes are never returned through the API or printed in logs.
- API responses reject unapproved browser origins; private configuration, database, source-server files and backups are never served. Only TLS SMTP is supported. Missing SMTP settings disable signup rather than simulate delivery.
- Listing creation requires `accounts.requireVerified(token)` and creates a pending record. Only admins can approve; owners or admins can remove. Pending images require an owner/admin token. Photos are sanitized JPEG blobs in the account database and are included in online backups. Public catalog responses omit seller email/account IDs. The GitHub origin is excluded from listing/photo/conversation API calls; actual marketplace functions are served by the home-hosted website. Payments and shipping are not implemented.
- Private conversations require verified buyer/seller participation on every server operation. Administrator status does not override this check. Own-listing messages and messages to unpublished listings are rejected. Removed-listing history remains available only to its participants and becomes read-only. Body length is 1–2000 characters, with send-rate limits, request-id deduplication and history pagination. The inbox shows the most recent 100 conversations; open conversations poll every 30 seconds while the tab is visible. There are no external message-notification emails.
- Conversation/message data is stored in SQLite and included in online backups. This is application access control, not end-to-end encryption: the physical server operator and anyone holding a readable private backup can access stored message data. Never share those backups publicly.

## Connecting the public website

TR: Geçici HTTPS testi için `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/start-https-test.ps1 -Publish` kullanılır. Resmi Cloudflare Quick Tunnel konteyneri yalnızca pazaryeri sunucusunu dışarı açar. Hesap veya alan adı gerekmez; adres değişkendir ve çalışma garantisi yoktur. Docker/tünel yeniden başlatıldıktan sonra aynı komut yeni adresi GitHub'a aktarabilir. Durdurmak için `docker compose --profile https-test stop https-test` kullanılır. Bu komut geçici dış erişimi kapatır; yerel sunucu çalışmaya devam eder. Gerçek mobil veri testi ayrıca yapılmalıdır.

EN: For temporary HTTPS testing, run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/start-https-test.ps1 -Publish`. The official Cloudflare Quick Tunnel container exposes only the marketplace server. No account or domain is required; the hostname is temporary and uptime is not guaranteed. After a Docker/tunnel restart, the same command can publish the new address to GitHub. Stop with `docker compose --profile https-test stop https-test`; this closes temporary external access while leaving the local server running. A real cellular-device test is still needed.

NL: Gebruik voor een tijdelijke HTTPS-test `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/start-https-test.ps1 -Publish`. De officiële Cloudflare Quick Tunnel-container maakt alleen de marktplaatsserver extern bereikbaar. Er is geen account of domein nodig; het adres is tijdelijk en er is geen beschikbaarheidsgarantie. Na herstart van Docker/de tunnel kan hetzelfde commando het nieuwe adres op GitHub publiceren. Stop met `docker compose --profile https-test stop https-test`; dit sluit tijdelijke externe toegang en laat de lokale server draaien. Een echte mobiele-datatest blijft nodig.

Reference: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

The Nextcloud service remains separate. Do not point public visitors at `localhost` or a private LAN IP. The optional tunnel uses outbound connections; no router forwarding or firewall port exposure is configured by this project.

After an HTTPS endpoint is available for this home server:

1. Add only the public hostname to private `allowedHosts` and `https://zekitazegul.github.io` to `allowedOrigins`. Keep port 4180 on loopback behind the HTTPS proxy/tunnel.
2. Apply the private configuration and restart the service.
3. Set the GitHub Actions repository Variable `HOME_AUTH_API_URL` to `https://YOUR_SERVER_HOST/api` and trigger Pages publication. No SMTP secrets belong in repository Variables.
4. Test actual delivery, rejection of incorrect/expired/reused codes, admin and member permissions, logout, and two different external devices. The automated local tests do not prove Yahoo delivery or internet reachability.

TR: Dışarıdan erişim için HTTPS bağlantısı ve sonrasında gerçek e-posta testi gerekir; bu aşamalar henüz yapılmadı.

EN: External access requires an HTTPS connection and a subsequent real email test; those steps are still pending.

NL: Externe toegang vereist een HTTPS-verbinding en daarna een echte e-mailtest; die stappen moeten nog worden uitgevoerd.

## Backups and migration

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/backup-home-server.ps1
```

This uses SQLite's online backup API, copies the server key and private configuration, then exports a snapshot from Docker into the ignored, restricted `backups/` folder. It does not need to stop the service. These backups contain account data and SMTP credentials: use encrypted storage/transfer and never upload them to GitHub.

For migration, install Docker on the new computer, copy this checkout without `node_modules`, pull/install dependencies, and create a fresh Compose service. Transfer the exported backup privately. Stop only the new marketplace service, restore `accounts.sqlite` and `server.key` into its data volume and `server-config.json` into its private-config volume, with ownership `1000:1000` and private file permissions. Restore offline using a one-off maintenance container with the same volumes; do not copy a live SQLite database file. Remove stale WAL/SHM files only in the stopped restore target. Restart and verify sign-in/admin rights before changing any public endpoint. Keep the old host and backup intact until verification succeeds.

Tested boundaries: real SQLite/HTTP code verification and server roles using an in-memory mail collector, Docker health checks, and backup export. No real email is sent by tests.

References: [Yahoo app passwords](https://help.yahoo.com/kb/SLN15241.html), [Yahoo SMTP settings](https://help.yahoo.com/kb/SLN4724.html), [Nodemailer SMTP](https://nodemailer.com/smtp), [Node.js SQLite](https://nodejs.org/api/sqlite.html).
