const keys=['favoritesEmpty','favoritesEmptyHelp','showAllListings','favoritesEyebrow'];
const rows={
tr:['Görüntülenecek favori ilan yok','İlanlardaki kalp simgesine dokunarak favorilerine ekleyebilirsin. Filtrelerini temizleyerek tekrar dene; yayından kaldırılan ilanlar burada görünmez.','Tüm ilanları göster','KAYDETTİĞİN İLANLAR'],
en:['No favorite listings to show','Tap the heart on a listing to save it. Try clearing your filters; listings that are no longer published do not appear here.','Show all listings','YOUR SAVED LISTINGS'],
nl:['Geen favoriete advertenties om te tonen','Tik op het hartje bij een advertentie om deze te bewaren. Probeer je filters te wissen; advertenties die niet meer gepubliceerd zijn verschijnen hier niet.','Alle advertenties tonen','JE BEWAARDE ADVERTENTIES'],
de:['Keine Favoriten zum Anzeigen','Tippe auf das Herz einer Anzeige, um sie zu speichern. Lösche gegebenenfalls die Filter; nicht mehr veröffentlichte Anzeigen erscheinen hier nicht.','Alle Anzeigen zeigen','DEINE GESPEICHERTEN ANZEIGEN'],
fr:['Aucune annonce favorite à afficher','Touchez le cœur d’une annonce pour l’enregistrer. Essayez de retirer les filtres ; les annonces qui ne sont plus publiées ne figurent pas ici.','Afficher toutes les annonces','VOS ANNONCES ENREGISTRÉES'],
it:['Nessun annuncio preferito da mostrare','Tocca il cuore di un annuncio per salvarlo. Prova a cancellare i filtri; gli annunci non più pubblicati non appaiono qui.','Mostra tutti gli annunci','I TUOI ANNUNCI SALVATI'],
es:['No hay anuncios favoritos para mostrar','Toca el corazón de un anuncio para guardarlo. Prueba a borrar los filtros; los anuncios que ya no están publicados no aparecen aquí.','Mostrar todos los anuncios','TUS ANUNCIOS GUARDADOS'],
pl:['Brak ulubionych ogłoszeń do wyświetlenia','Dotknij serca przy ogłoszeniu, aby je zapisać. Spróbuj wyczyścić filtry; nieopublikowane już ogłoszenia nie są tutaj widoczne.','Pokaż wszystkie ogłoszenia','TWOJE ZAPISANE OGŁOSZENIA'],
pt:['Não há anúncios favoritos para mostrar','Toque no coração de um anúncio para o guardar. Experimente limpar os filtros; os anúncios que já não estão publicados não aparecem aqui.','Mostrar todos os anúncios','OS SEUS ANÚNCIOS GUARDADOS']
};
export const favoriteMessages=Object.fromEntries(Object.entries(rows).map(([lang,values])=>[lang,Object.fromEntries(keys.map((key,index)=>[key,values[index]]))]));
