# 2026-10-19 — Mesajlaşma / Messaging / Berichten

TR: Doğrulanmış alıcılar yayınlanan ilan üzerinden satıcıya özel konuşma başlatabilir. Üst menüde gelen kutusu/okunmamış sayacı, cevap verme ve eski mesajları yükleme eklendi. Konuşmayı yalnızca alıcı ve satıcı okuyabilir; yönetici rolü üçüncü taraf erişimi sağlamaz. E-posta adresleri otomatik paylaşılmaz. Kaldırılan ilanların geçmişi okunur, yeni mesaj gönderilemez. Tekrarlanan ağ istekleri aynı mesajı çoğaltmaz. Dokuz dil ve mobil/tablet/masaüstü düzenleri güncellendi. Test mesajları yalnızca geçici test veritabanında oluşturuldu.

EN: Verified buyers can start a private seller conversation from a published listing. Added an inbox/unread counter, replies and older-message loading. Only the buyer and seller can read a conversation; administrator status provides no third-party access. Email addresses are not automatically shared. Removed-listing history stays readable but cannot receive new messages. Retried network requests do not duplicate messages. Updated nine languages and mobile/tablet/desktop layouts. Test messages exist only in temporary test databases.

NL: Geverifieerde kopers kunnen via een gepubliceerde advertentie een privégesprek met de verkoper starten. Een inbox/ongelezen teller, antwoorden en eerdere berichten laden zijn toegevoegd. Alleen koper en verkoper kunnen het gesprek lezen; beheerdersrechten geven geen toegang als derde. E-mailadressen worden niet automatisch gedeeld. De geschiedenis bij verwijderde advertenties blijft leesbaar, maar nieuwe berichten zijn geblokkeerd. Herhaalde netwerkverzoeken maken geen dubbele berichten. Negen talen en mobiele/tablet/desktopindelingen zijn bijgewerkt. Testberichten staan alleen in tijdelijke testdatabases.

# 2026-10-19 — İlanlar / Listings / Advertenties

TR: Doğrulanmış kullanıcılar başlık, açıklama, EUR fiyatı, kategori, ürünün fiziksel ülkesi/şehri ve 1–4 fotoğrafla ilan gönderebilir. İlanlar yönetici incelemesinden sonra yayınlanır. İlan sahibi veya yönetici ilanı kaldırabilir. Bekleyen fotoğraflar yalnızca sahibine/yöneticiye açıktır; halka açık yanıtlarda e-posta veya hesap kimliği paylaşılmaz. Fotoğraflar yeniden kodlanır ve EXIF temizlenir; SQLite yedeklerine dahildir. Arayüz dokuz dildedir; kullanıcının yazdığı ilan metni olduğu gibi gösterilir. Gerçek ilanlar ev sunucusunda çalışır; GitHub Pages demo ekranı pazaryeri bağlantısını gösterir. Ödeme, kargo ve satıcıyla iletişim eklenmedi.

EN: Verified users can submit a title, description, EUR price, category, physical item country/city and 1–4 photos. Listings appear after admin review; owners or admins can remove them. Pending photos are owner/admin-only; public responses omit account IDs and email addresses. Images are re-encoded with EXIF removed and included in SQLite backups. The interface supports nine languages; user-written listing text is shown as entered. Real listings run on the home server; GitHub Pages remains a demo linking to the marketplace. Payments, shipping and seller contact are not included.

NL: Geverifieerde gebruikers kunnen een titel, beschrijving, EUR-prijs, categorie, fysiek land/plaats en 1–4 foto’s insturen. Advertenties verschijnen na beheerderscontrole; eigenaren of beheerders kunnen ze verwijderen. Foto’s in afwachting zijn alleen zichtbaar voor de eigenaar/beheerder; openbare antwoorden bevatten geen account-ID of e-mailadres. Foto’s worden opnieuw gecodeerd zonder EXIF en opgenomen in SQLite-back-ups. De interface ondersteunt negen talen; advertentietekst wordt weergegeven zoals ingevoerd. Echte advertenties draaien op de thuisserver; GitHub Pages blijft een demo met een koppeling naar de marktplaats. Betaling, verzending en verkoperscontact zijn niet inbegrepen.

# 2026-10-19 — Geçici HTTPS / Temporary HTTPS / Tijdelijke HTTPS

TR: İsteğe bağlı resmi Cloudflare Quick Tunnel konteyneri ve adresi GitHub Pages'e bağlayan kurulum komutu eklendi. Geçici HTTPS adresi hesap veya alan adı satın almadan kullanılabilir; tünel yeniden oluşturulunca değişir. API erişimi, GitHub CORS izinleri, yetkisiz yönetici ve gizli dosya erişimlerinin reddi kontrol edildi. Gerçek mobil veri testi kullanıcı tarafından yapılmalıdır.

EN: Added an optional official Cloudflare Quick Tunnel container and a setup command to connect its address to GitHub Pages. The temporary HTTPS address requires no account or domain purchase and changes when the tunnel is recreated. Checked API access, GitHub CORS permissions, and rejection of anonymous admin/private-file access. Actual cellular-device testing remains for the user.

NL: Een optionele officiële Cloudflare Quick Tunnel-container en een installatiecommando koppelen het adres aan GitHub Pages. Het tijdelijke HTTPS-adres vereist geen account of domeinaankoop en verandert bij opnieuw aanmaken van de tunnel. API-toegang, GitHub CORS-rechten en het weigeren van anonieme beheertoegang/privébestanden zijn gecontroleerd. Een echte mobiele-datatest blijft voor de gebruiker.

# 2026-10-19 — İstek sınırı / Request limits / Verzoeklimieten

TR: Erken tekrarlar ve başarısız SMTP gönderimleri artık e-posta kodu kotasını tüketmez. Güvenlik sınırları korunur. Sunucu bekleme süresini bildirir; dokuz dilde geri sayım görünür ve bu sürede tekrar gönderim engellenir.

EN: Early retries and failed SMTP deliveries no longer consume the email-code quota. Security limits remain enforced. The server returns the wait time; a countdown appears in all nine languages and prevents repeated submission while waiting.

NL: Te vroege herhalingen en mislukte SMTP-verzendingen verbruiken het e-mailcodequotum niet meer. Beveiligingslimieten blijven actief. De server geeft de wachttijd door; een aftelling in alle negen talen voorkomt herhaalde verzending tijdens het wachten.

# 2026-10-19 — Oturum göstergesi / Session indicator / Sessiestatus

TR: Giriş sonrası sayfanın üstünde yeşil durum bandı, hesap e-postası, yönetici rozeti, yönetici paneli bağlantısı ve çıkış düğmesi gösterilir. Durum sayfa yenilemede sunucudan doğrulanır, çıkışta temizlenir ve sekmeye dönüldüğünde yeniden kontrol edilir. Dokuz dil ve mobil/masaüstü düzenleri güncellendi.

EN: After sign-in, a green page banner shows the account email, administrator badge, admin-panel shortcut and sign-out button. The session is validated on reload, cleared on logout and checked again when returning to the tab. Updated all nine languages and mobile/desktop layouts.

NL: Na aanmelding toont een groene balk het accountadres, de beheerdersbadge, een koppeling naar het beheerpaneel en een uitlogknop. De sessie wordt bij herladen geverifieerd, bij uitloggen verwijderd en opnieuw gecontroleerd bij terugkeer naar het tabblad. Alle negen talen en mobiele/desktopindelingen zijn bijgewerkt.

# 2026-10-19 — Docker home server

TR: Kullanıcının tercihiyle Supabase kaldırıldı. Üyelik, bağımsız Docker konteynerindeki Node.js + SQLite sunucusuna taşındı. Kod süresi, tekrar kullanım engeli, deneme sınırı, hız sınırı, sunucu tarafı yönetici kontrolü ve oturum iptali eklendi. Kodlar/oturumlar sunucuda yalnızca anahtarlı özet olarak tutulur. Yahoo SMTP kurulumu için gizli yerel araç, kalıcı Docker volume'ları ve dışa aktarılabilir SQLite yedeği hazırlandı. Yerel servis sağlıklı; Yahoo uygulama parolası ve dış erişim HTTPS bağlantısı bekleniyor. Gerçek e-posta gönderilmedi. Mevcut Nextcloud servisleri değiştirilmedi.

EN: Removed Supabase at the owner's request. Accounts now use a Node.js + SQLite server in a separate Docker container. Added code expiry, replay protection, attempt/rate limits, server-side admin checks and session revocation. Server-side codes/sessions are stored only as keyed hashes. Added a private local Yahoo SMTP setup tool, persistent Docker volumes and exportable SQLite backups. Local service is healthy; Yahoo app-password configuration and an external HTTPS connection remain pending. No actual email has been sent. Existing Nextcloud services were not modified.

NL: Supabase is op verzoek van de eigenaar verwijderd. Accounts gebruiken nu een Node.js + SQLite-server in een afzonderlijke Docker-container. Codeverval, bescherming tegen hergebruik, poging-/snelheidslimieten, servercontrole van beheerdersrechten en sessie-intrekking zijn toegevoegd. Codes/sessies staan op de server alleen als hashes met sleutel. Een privéhulpmiddel voor Yahoo SMTP, permanente Docker-volumes en exporteerbare SQLite-back-ups zijn toegevoegd. De lokale dienst is gezond; een Yahoo-appwachtwoord en een externe HTTPS-verbinding moeten nog worden ingesteld. Er is geen echte e-mail verstuurd. Bestaande Nextcloud-diensten zijn niet gewijzigd.

# 2026-10-19 — Üyelik hazırlığı / Account preparation / Accountvoorbereiding

TR: Dokuz dilde e-posta koduyla giriş ekranı ve yönetici girişi eklendi. Supabase doğrulaması, özel yönetici rolü ve sunucuda korunan hesap istatistikleri için entegrasyon/migrasyon hazırlandı. Supabase/SMTP ve ilk yönetici kurulumu bekleniyor; canlı üyelik henüz açık değil. Gerçek alım-satım eklenmedi; gelecekte sunucuda doğrulanmış hesap gerektirecek. Mock testleri gerçek e-posta göndermez. Kurulum: `docs/AUTH_SETUP.md`.

EN: Added nine-language email-code and admin sign-in screens. Prepared Supabase integration and a migration for private admin roles and server-protected account statistics. Supabase/SMTP and first-admin setup are pending; live registration is not enabled. Actual trading is not implemented and must require verified accounts on the server when added. Mock tests send no actual email. Setup: `docs/AUTH_SETUP.md`.

NL: Aanmeldschermen met e-mailcode en beheerdersaanmelding zijn toegevoegd in negen talen. Supabase-integratie en een migratie voor privébeheerdersrollen en serverbeveiligde accountstatistieken zijn voorbereid. Supabase/SMTP en de eerste beheerder moeten nog worden ingesteld; registratie is nog niet ingeschakeld. Echte handel is niet geïmplementeerd en moet later geverifieerde accounts op de server vereisen. Mocktests versturen geen echte e-mail. Installatie: `docs/AUTH_SETUP.md`.

# 2026-10-19 — E-posta / Email / E-mail

TR: Geri bildirim formunun GitHub Issues yönlendirmesi kaldırıldı. Form artık ziyaretçinin e-posta uygulamasında geliştiriciye gönderilecek bir taslak hazırlar; ziyaretçi mesajı kendisi gönderir. E-posta uygulaması olmayanlar için adres görünürdür. Mesajlar sitede yayınlanmaz. Dokuz dil güncellendi. Gerçek e-posta gönderimi testlerde yapılmadı.

EN: Removed the feedback form's GitHub Issues redirect. The form now prepares a draft to the developer in the visitor's email app; the visitor sends it themselves. The address is visible for visitors without an email app. Messages are not published on the site. All nine languages were updated. Tests do not send actual email.

NL: De GitHub Issues-verwijzing in het feedbackformulier is verwijderd. Het formulier maakt nu een concept aan de ontwikkelaar klaar in de e-mailapp van de bezoeker; de bezoeker verstuurt het zelf. Het adres is zichtbaar voor bezoekers zonder e-mailapp. Berichten worden niet op de website gepubliceerd. Alle negen talen zijn bijgewerkt. Tests versturen geen echte e-mail.

# 2026-10-19 — GitHub Pages demo

TR: Kullanıcı site ve kaynak kodun herkese açık yayınını onayladı. `main` güncellemeleri test edilip GitHub Pages ile otomatik yayınlanır. İlk kapsam Hollanda, Belçika ve Almanya; uluslararası genişleme hedeflenir. Türkçe, İngilizce ve Hollandacaya Almanca, Fransızca, İtalyanca, İspanyolca, Lehçe ve Portekizce eklendi. Yapım aşaması bildirimi ve örnek ilan açıklamaları korundu. Öneri formu, ziyaretçinin mesajını GitHub Issues üzerinde kontrol edip göndermesini sağlar; GitHub hesabı gerekir ve mesajlar herkese açıktır. Form site üzerinde mesaj saklamaz. Gerçek ticari işlemler ve ziyaret analitiği eklenmedi.

EN: The user approved public site and source publication. Updates to `main` are tested and automatically published with GitHub Pages. Initial scope: the Netherlands, Belgium and Germany, with international expansion planned. German, French, Italian, Spanish, Polish and Portuguese join Turkish, English and Dutch. The construction notice and demo disclosures remain. The feedback form lets visitors review and submit messages through GitHub Issues; a GitHub account is required and messages are public. The form does not store messages on the site. Real commercial transactions and visitor analytics are not included.

NL: De gebruiker heeft openbare publicatie van de website en broncode goedgekeurd. Updates op `main` worden getest en automatisch via GitHub Pages gepubliceerd. Eerste scope: Nederland, België en Duitsland, met internationale uitbreiding als doel. Duits, Frans, Italiaans, Spaans, Pools en Portugees zijn toegevoegd naast Turks, Engels en Nederlands. De bouwmelding en demo-uitleg blijven zichtbaar. Met het feedbackformulier kunnen bezoekers berichten op GitHub Issues controleren en versturen; een GitHub-account is nodig en berichten zijn openbaar. Het formulier bewaart geen berichten op de website. Echte commerciële transacties en bezoekersstatistieken zijn niet toegevoegd.

# 0.1.0 — 2026-10-19

## Türkçe
İlk yerel prototip: üç dil, ürün konumuna göre ülke filtresi, arama, kategori, fiyat, durum, sıralama, ilan detayları ve tarayıcıda saklanan favoriler. Tüm ilanlar temsili görselli örnek verilerdir. Alım, satım, ödeme ve mesajlaşma henüz yoktur.

## English
First local prototype: three languages, item-location country filter, search, categories, price, condition, sorting, listing details and browser-local favorites. All listings are sample data with illustrations. Buying, selling, payments and messaging are not available yet.

## Nederlands
Eerste lokale prototype: drie talen, landfilter op artikellocatie, zoeken, categorieën, prijs, staat, sorteren, advertentiedetails en lokaal opgeslagen favorieten. Alle advertenties zijn voorbeeldgegevens met illustraties. Kopen, verkopen, betalingen en berichten zijn nog niet beschikbaar.

## Listing updates / Advertenties bijwerken / İlan güncellemeleri

- TR: Kullanıcı kendi ilanını düzenleyebilir; değişiklikler yeniden onaya gider. Fotoğraflar korunabilir veya tümü değiştirilebilir. Satıldı olarak işaretlenen ilan katalogdan kalkar; mesaj geçmişi okunabilir, yeni mesaj gönderilemez.
- EN: Owners can edit their listings and resubmit them for approval, retaining photos or replacing all photos. Sold listings leave the catalogue; conversation history remains readable and new messages are disabled.
- NL: Eigenaren kunnen advertenties bewerken en opnieuw ter goedkeuring aanbieden, met behoud of vervanging van alle foto's. Verkochte advertenties verdwijnen uit het aanbod; bestaande berichten blijven leesbaar en nieuwe berichten zijn uitgeschakeld.

## Relisting / Opnieuw aanbieden / Yeniden yayınlama

- TR: Satılmış ilanı yalnızca sahibi “Yeniden yayınla” ile tekrar incelemeye gönderebilir. Fotoğraflar ve mesaj geçmişi korunur. Yönetici onayına kadar ilan katalogda görünmez ve yeni mesaj gönderilemez. Kaldırılmış ilanlar geri getirilemez.
- EN: Owners can resubmit sold listings for review with “Relist”. Photos and conversation history are preserved. The listing stays out of the catalogue and new messages remain disabled until administrator approval. Removed listings cannot be restored.
- NL: Eigenaren kunnen verkochte advertenties opnieuw ter beoordeling aanbieden. Foto’s en gespreksgeschiedenis blijven bewaard. Tot goedkeuring blijft de advertentie buiten het aanbod en zijn nieuwe berichten uitgeschakeld. Verwijderde advertenties kunnen niet worden hersteld.

- TR: Geliştiriciye öneri formu, ana sayfada yer kaplamaması için alt kısımdaki “İletişim” bağlantısıyla açılan ayrı pencereye taşındı.
- EN: The developer feedback form now opens in a separate dialog from the footer’s “Contact” link, keeping the homepage compact.
- NL: Het feedbackformulier voor de ontwikkelaar opent nu in een apart venster via “Contact” onderaan de pagina, zodat de hoofdpagina compact blijft.

## Passwords and remembered sessions / Wachtwoorden en onthouden sessies / Parola ve hatırlanan oturum

- TR: Parola veya e-posta koduyla başarılı girişten sonra giriş penceresi kapanır, ana sayfanın üstüne dönülür ve “Giriş yapıldı” bildirimi gösterilir. Hatalı girişte pencere açık kalır. Hesap ayarları ve yönetici paneli ilgili düğmelerden tekrar açılabilir.
- EN: Successful password or email-code login closes the dialog, returns to the top of the homepage and shows a signed-in notification. Failed login keeps the dialog open. Account settings and administrator tools remain available through their buttons.
- NL: Na inloggen met wachtwoord of e-mailcode sluit het venster, ga je naar de bovenkant van de hoofdpagina en verschijnt een melding. Bij een mislukte aanmelding blijft het venster open. Accountinstellingen en beheer blijven via hun knoppen beschikbaar.

- TR: Doğrulanmış kullanıcılar ve yönetici, Hesabım bölümünden site parolası oluşturabilir. Sonraki girişler e-posta ve parolayla kod istemeden yapılır. Unutulan parola için e-posta koduyla giriş korunur. “Bugün beni hatırla”, aynı tarayıcıda gün sonuna kadar (en fazla 24 saat) oturumu korur; çıkış tüm hatırlanan sekmeleri kapatır. Parola değişikliği mevcut parola veya son 10 dakikadaki kod doğrulaması gerektirir ve diğer oturumları kapatır.
- EN: Verified members and administrators can create a site password in My account and then sign in with email and password without a new code. Email-code login remains available for recovery. “Remember me today” keeps the session in this browser until local midnight (at most 24 hours); logout clears remembered sessions across tabs. Password changes require the current password or a code verified in the past ten minutes and revoke other sessions.
- NL: Geverifieerde gebruikers en beheerders kunnen bij Mijn account een wachtwoord instellen en daarna zonder nieuwe code met e-mail en wachtwoord inloggen. E-mailcodes blijven beschikbaar voor herstel. “Onthoud mij vandaag” bewaart de sessie in deze browser tot middernacht (maximaal 24 uur); uitloggen wist de onthouden sessie in alle tabbladen. Wachtwoordwijzigingen vereisen het huidige wachtwoord of een codeverificatie van minder dan tien minuten geleden en beëindigen andere sessies.
