# Shopping Website Project

## Türkçe
Uluslararası ikinci el pazaryeri için demo. İlk kapsam Hollanda, Belçika ve Almanya; ileride daha fazla ülke hedefleniyor. Ürünleri fiziksel konumuna göre filtreleyebilir, arama yapabilir ve favorileri tarayıcıda saklayabilirsin. Tüm ilanlar örnektir. Gerçek alım, satım ve ödeme yoktur.

Çalıştır: `npm start` → http://127.0.0.1:4173
Kontrol: `npm test`

## English
Demo for an international second-hand marketplace, starting with the Netherlands, Belgium and Germany, with more countries planned later. Filter items by physical country, search, and save favorites in your browser. All listings are samples. Real buying, selling and payments are unavailable.

Run: `npm start` → http://127.0.0.1:4173
Check: `npm test`

## Nederlands
Demo voor een internationaal tweedehandsplatform, te beginnen met Nederland, België en Duitsland, met later meer landen als doel. Filter op het land waar het artikel zich bevindt, zoek en bewaar favorieten in je browser. Alle advertenties zijn voorbeelden. Echt kopen, verkopen en betalen is niet beschikbaar.

Start: `npm start` → http://127.0.0.1:4173
Controle: `npm test`

Node.js 24+ required. Install the free SMTP dependency with `npm ci`. Build: `npm run build`.

## Yerel üyelik sunucusu / Local account server / Lokale accountserver

TR: Üyelik için Supabase kaldırıldı. Docker'da Node.js + SQLite sunucusu çalışır: `docker compose up -d --build`, adres `http://127.0.0.1:4180`. Kalıcı hesaplar ve gizli ayarlar Docker volume'larındadır. Yahoo uygulama parolası yerel kurulum aracına girilmelidir; girilene kadar üyelik kapalıdır. GitHub'daki siteyi bu sunucuya bağlamak için ayrıca dışarıdan erişilen HTTPS adresi gerekir. Kurulum ve taşınabilir yedekleme: [AUTH_SETUP.md](docs/AUTH_SETUP.md).

EN: Supabase has been removed from the account system. The Node.js + SQLite server runs in Docker: `docker compose up -d --build`, at `http://127.0.0.1:4180`. Persistent accounts and private settings live in Docker volumes. Enter a Yahoo app password through the local setup tool; registration remains disabled until configured. Connecting the GitHub site also requires a publicly reachable HTTPS endpoint. Setup and portable backups: [AUTH_SETUP.md](docs/AUTH_SETUP.md).

NL: Supabase is verwijderd uit het accountsysteem. De Node.js + SQLite-server draait in Docker: `docker compose up -d --build`, op `http://127.0.0.1:4180`. Permanente accounts en privé-instellingen staan in Docker-volumes. Voer een Yahoo-appwachtwoord in via het lokale installatiehulpmiddel; registratie blijft uitgeschakeld tot dit is ingesteld. Voor verbinding met de GitHub-site is ook een extern bereikbaar HTTPS-adres nodig. Installatie en overdraagbare back-ups: [AUTH_SETUP.md](docs/AUTH_SETUP.md).

## Yayınlama / Publishing / Publicatie

TR: Gerçek ilan oluşturma, fotoğraf yükleme ve yönetici incelemesi ev sunucusunun HTTPS adresindedir. Yerelde `http://127.0.0.1:4180` kullanılır. Yeni ilanlar onaya kadar gizlidir. GitHub Pages örnek ilanlı demo olarak kalır ve ev sunucusundaki pazaryerine bağlantı verir. İlan metinleri kullanıcı tarafından yazıldığı dilde gösterilir.

EN: Real listing creation, photo uploads and moderation run at the home server's HTTPS address, or locally at `http://127.0.0.1:4180`. New listings remain private until approved. GitHub Pages stays a sample-listing demo linking to the home-hosted marketplace. User-written listing text retains its original language.

NL: Echte advertenties, foto-uploads en moderatie draaien op het HTTPS-adres van de thuisserver, of lokaal op `http://127.0.0.1:4180`. Nieuwe advertenties blijven privé tot goedkeuring. GitHub Pages blijft een demo met voorbeeldadvertenties en een koppeling naar de thuis gehoste marktplaats. Advertentietekst behoudt de oorspronkelijke taal.

TR: GitHub Pages, `main` dalına gönderilen güncellemeleri test edip `dist/` çıktısını yayınlar. Yayın adresi: https://zekitazegul.github.io/shopping-website-project/ . GitHub Pages yalnızca demo için kullanılır; gerçek ticari işlemler için uygun barındırmaya geçilmelidir. İleride bir `.com` alan adı değerlendirilebilir; şu anda satın alınmaz.

EN: GitHub Pages tests updates pushed to `main` and publishes the `dist/` output. Site URL: https://zekitazegul.github.io/shopping-website-project/ . GitHub Pages is used for the demo only; real commercial transactions require suitable hosting. A `.com` domain may be considered later; none is purchased now.

NL: GitHub Pages test updates op `main` en publiceert de uitvoer in `dist/`. Websiteadres: https://zekitazegul.github.io/shopping-website-project/ . GitHub Pages wordt alleen voor de demo gebruikt; echte commerciële transacties vereisen geschikte hosting. Een `.com`-domein kan later worden overwogen; er wordt nu niets gekocht.

TR: Arayüz ve örnek ilanlar dokuz dilde sunulur: Türkçe, İngilizce, Hollandaca, Almanca, Fransızca, İtalyanca, İspanyolca, Lehçe ve Portekizce. Dil seçimi ürünün ülke filtresini değiştirmez. Geri bildirim formu, geliştiriciye gönderilecek mesajı ziyaretçinin e-posta uygulamasında hazırlar. Ziyaretçi kendisi gönderir; mesajlar sitede veya GitHub Issues içinde yayınlanmaz.

EN: The interface and sample listings support nine languages: Turkish, English, Dutch, German, French, Italian, Spanish, Polish and Portuguese. Language selection does not change the item-country filter. The feedback form prepares a message to the developer in the visitor’s email app. The visitor sends it themselves; messages are not published on the site or in GitHub Issues.

NL: De interface en voorbeeldadvertenties ondersteunen negen talen: Turks, Engels, Nederlands, Duits, Frans, Italiaans, Spaans, Pools en Portugees. De taalkeuze verandert het landfilter voor artikelen niet. Het feedbackformulier maakt een bericht aan de ontwikkelaar klaar in de e-mailapp van de bezoeker. De bezoeker verstuurt het zelf; berichten worden niet op de website of in GitHub Issues gepubliceerd.

See docs/PROJECT_PLAN.md and docs/RELEASE_NOTES.md. GitHub Pages usage limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
