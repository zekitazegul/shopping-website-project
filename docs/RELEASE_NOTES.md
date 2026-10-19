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
