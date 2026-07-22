# PRD: Fryslagerappen

- **Status:** Utkast v0.1
- **Datum:** 2026-07-22
- **Produktnamn:** Arbetsnamn *Fryslagerappen*
- **Primär plattform:** iPhone
- **Källa:** privat användarintervju (råmaterialet versionshanteras inte)
- **Intervjudeltagare:** två anonymiserade vuxna hushållsmedlemmar

## 1. Sammanfattning

Fryslagerappen ska ge ett hushåll en gemensam, aktuell och lättillgänglig bild av vad som finns i hemmets frysar. Den ska särskilt lösa problemet med egenlagad och egenplockad mat — till exempel sylt, mos, bär och grytor — som annars blir bortglömd, samt hjälpa familjen att undvika onödiga inköp av varor som redan finns hemma.

Produktens viktigaste egenskap är inte maximal registreringsprecision utan **extremt låg arbetsinsats**. Om varje förändring kräver mycket skrivande kommer registret inte att hållas aktuellt. Därför ska ett föremål kunna registreras med foto och/eller svensk talinmatning, med AI-stöd för att föreslå namn, kategori, datum, placering och hållbarhet. Användaren ska i normalfallet bara behöva kontrollera förslaget och bekräfta.

MVP:n ska stödja:

- två eller flera namngivna frysplatser, initialt ”Frysen uppe” och ”Frysboxen nere”;
- ett delat hushåll med minst två iPhone-användare;
- snabb registrering med foto, röst eller en kombination av båda;
- ett sökbart lager som fungerar hemma och i butiken;
- hantering av mängd, infrysningsdatum och bäst före-/ät-snart-information;
- snabb borttagning eller mängdminskning när mat tas ur frysen;
- synk mellan användarnas telefoner;
- ett enkelt webbläge för överblick, åtminstone som läsbar vy efter MVP om det hotar leveranstiden.

Produktens övergripande effekt ska vara att hushållet äter upp mer av maten som redan finns, kastar mindre mat och undviker onödiga dubbelköp.

## 2. Bakgrund och problem

### 2.1 Nuläge

Hushållet har minst två frysar. Innehållet är staplat så att de senast eller överst placerade varorna är lättast att se och använda. Det saknas en gemensam förteckning över vad som finns, var det finns och hur länge det bör sparas.

Det skapar flera konkreta problem:

1. **Dålig överblick:** användarna vet inte vad som ligger längre ned i frysen.
2. **Onödiga inköp:** i butiken går det inte snabbt att avgöra om en viss vara, exempelvis fisk eller glass, redan finns hemma.
3. **Bortglömd hemlagad mat:** sylt, mos, bär, grytor och andra egenproducerade varor saknar ofta tydlig originalförpackning och blir därför svåra att identifiera och prioritera.
4. **Matsvinn:** mat glöms bort tills kvaliteten försämras eller användaren inte längre vågar äta den.
5. **Fysisk friktion:** användaren vill inte gå ut eller ned till frysboxen bara för att kontrollera innehållet, särskilt när det är kallt.
6. **Administrativ friktion:** ett register som kräver mycket manuell textinmatning kommer sannolikt inte att hållas uppdaterat.
7. **Delad verklighet:** två personer behöver se och ändra samma lager utan att separata listor divergerar.

### 2.2 Möjlighet

En mobil, delad inventering med foto- och röstinmatning kan göra det lika enkelt att registrera en vara som att lägga den i frysen. AI kan minska mängden manuell administration, men användaren måste snabbt kunna rätta osäkra tolkningar. Produktens värde uppstår först när registret är tillräckligt aktuellt för att användarna ska lita på det i köket och i butiken.

## 3. Mål och avgränsningar

### 3.1 Produktmål

- Ge hushållet en tillförlitlig överblick över frysarnas innehåll och placering.
- Göra registrering av en ny vara till en handling som normalt tar högst 10–15 sekunder.
- Göra det möjligt att svara på ”Har vi X hemma?” på några sekunder.
- Hjälpa användarna att prioritera mat som bör ätas snart.
- Synkronisera ändringar mellan hushållets användare utan dubbelarbete.
- Minska matsvinn och onödiga dubbelköp.

### 3.2 Icke-mål för MVP

- Fullständigt inköps-, recept- eller måltidsplaneringssystem.
- Hantering av kylskåp, skafferi eller andra lagerplatser utanför frysen.
- Automatisk fysisk identifiering via streckkodsläsare, vågar, RFID eller sensorer.
- Exakt livsmedelssäkerhetsbedömning eller garanti att en vara är säker att äta.
- Integration med matbutiker, kassakvitton eller leveranstjänster.
- Avancerad näringsberäkning.
- Automatiskt avdrag av varor utan att någon användare bekräftar det.

## 4. Användare och behov

### 4.1 Primär användare: hushållsmedlem som lägger in mat

Behöver registrera en vara när händerna är upptagna och tålamodet är lågt. Vill helst fotografera, tala eller göra båda, och bara korrigera om appen har missförstått något.

### 4.2 Primär användare: hushållsmedlem som planerar eller handlar

Behöver snabbt söka efter en vara och se mängd, placering och ålder från köket, butiken eller annan plats.

### 4.3 Sekundär användare: hushållsmedlem som tar ut mat

Behöver kunna markera en vara som förbrukad eller minska mängden med ett tryck. Om detta steg är krångligt blir lagret snabbt felaktigt.

### 4.4 Centrala “jobs to be done”

- När jag fryser in hemlagad eller egenplockad mat vill jag registrera den på några sekunder, så att vi kommer ihåg vad den är och när den lades in.
- När jag står i butiken vill jag kunna se om vi redan har en viss vara, så att jag inte köper dubbelt.
- När vi planerar en måltid vill jag kunna söka i alla frysar utan att gå och leta fysiskt.
- När mat börjar bli gammal vill jag veta vad vi bör äta först, så att mindre behöver kastas.
- När någon i hushållet ändrar lagret vill jag att alla ser samma information.

## 5. Produktprinciper

1. **Snabbare än en handskriven lista:** standardflödet får inte kännas som lageradministration.
2. **Foto och röst först:** tangentbordet är en reservlösning, inte huvudflödet.
3. **Bekräfta hellre än fyll i:** AI föreslår strukturerade uppgifter; användaren godkänner eller rättar.
4. **Tydlig osäkerhet:** appen får inte presentera gissade datum eller identifieringar som säkra fakta.
5. **En gemensam sanning:** alla hushållsmedlemmar ska se samma lager och ändringshistorik.
6. **Korrigering ska vara billig:** det måste vara lätt att rätta namn, plats, mängd och datum.
7. **Matsvinn före katalogperfektion:** appen ska prioritera användbar överblick och ”ät snart” framför detaljer som inte påverkar beslut.

## 6. Omfattning och prioritering

### 6.1 Must have — MVP

- Skapa eller ansluta till ett delat hushåll.
- Skapa och namnge flera frysplatser.
- Registrera vara med foto, tal eller manuell text.
- Svensk taligenkänning.
- Bildtolkning/OCR för etikett, produktnamn och synliga datum.
- Ange eller bekräfta namn, kategori, mängd, enhet, plats och datum.
- Söka och filtrera hela lagret.
- Se detaljvy med foto och all registrerad information.
- Minska mängd eller markera vara som förbrukad.
- Redigera och återställa nyligen borttagna poster.
- Synk mellan minst två iPhones.
- Visa ”ät snart” utifrån känt eller uppskattat datum.
- Fungera med tillfälligt dålig uppkoppling och synka senare.

### 6.2 Should have — tidig version efter MVP

- Webbläge för sökning och lageröverblick.
- Pushnotiser eller veckosammanfattning för varor som bör ätas snart.
- Smartare förslag på hållbarhet baserat på livsmedelskategori och infrysningsdatum.
- Favoritsökningar och snabbfilter, exempelvis ”bär”, ”glass” och ”lagad mat”.
- Dubblettvarning när en liknande vara redan finns.
- Händelsehistorik per vara.

### 6.3 Could have — senare

- Receptförslag baserade på varor som bör användas snart.
- Inköpslistekoppling.
- Streckkodsskanning.
- Automatisk gruppering av identiska förpackningar.
- Stöd för fler språk och fler typer av hushållslager.
- Delning med tillfälliga användare eller gäster.

## 7. Viktigaste användarflöden

### 7.1 Första start och hushåll

1. Första användaren skapar ett hushåll.
2. Appen föreslår två platser: ”Frysen uppe” och ”Frysboxen nere”. Namnen kan ändras och fler platser kan läggas till.
3. Användaren bjuder in en annan hushållsmedlem via systemets delningsfunktion eller länk.
4. Den inbjudna användaren accepterar och ser samma lager.
5. Båda kan lägga till, ändra och ta bort varor.

### 7.2 Lägg till vara — rekommenderat snabbflöde

1. Användaren öppnar appen och trycker på den tydliga knappen **Lägg till**.
2. Användaren fotograferar varan och dess handskrivna eller tryckta etikett.
3. Användaren kan samtidigt eller därefter säga exempelvis: ”Två burkar blåbärssylt, gjord i juli, läggs i frysboxen nere.”
4. Appen kombinerar bild, OCR och tal för att föreslå:
   - namn;
   - kategori;
   - mängd och enhet;
   - frysplats;
   - infrysnings-/tillagningsdatum;
   - känt bäst före-datum eller uppskattat ”ät före”.
5. En kompakt bekräftelsevy visar förslaget. Osäkra fält markeras.
6. Användaren trycker **Spara** eller rättar ett fält och sparar.
7. Varan blir omedelbart synlig för övriga hushållsmedlemmar.

**Mål:** en vanlig registrering ska kräva högst ett foto, en kort fras och ett bekräftelsetryck.

### 7.3 Lägg till vara — röst utan foto

1. Användaren håller inne eller trycker på mikrofonknappen.
2. Användaren beskriver vara, mängd och plats.
3. Appen skapar ett strukturerat förslag.
4. Användaren bekräftar eller rättar.

Detta flöde är viktigt när kameran är opraktisk eller när varan redan har en tydlig fysisk etikett.

### 7.4 Sök före eller under ett inköp

1. Användaren öppnar appen.
2. Sökfältet är direkt tillgängligt.
3. Användaren skriver eller talar exempelvis ”glass”, ”fisk” eller ”blåbär”.
4. Resultatet visar totalt antal, varje posts placering och eventuell ”ät snart”-status.
5. Användaren kan öppna fotot för att verifiera exakt variant.

### 7.5 Ta ut eller förbruka en vara

1. Användaren söker, skannar listan eller öppnar ”ät snart”.
2. En snabbåtgärd erbjuder **Ta ut en**, **Ändra mängd** eller **Förbrukad**.
3. Vid **Förbrukad** försvinner posten från det aktiva lagret men kan återställas under en begränsad period.
4. Ändringen synkas till övriga användare.

### 7.6 Ät snart

1. Startsidan visar en prioriterad lista över varor med passerat eller närliggande datum.
2. Varje rad anger om datumet är avläst, manuellt angivet eller uppskattat.
3. Användaren kan öppna posten, skjuta fram rekommendationen efter egen bedömning eller markera den som förbrukad/kastad.
4. Appen ska aldrig säga att en vara är säker att äta; den visar endast registrerad information och planeringsstöd.

## 8. Funktionella krav

### FR-1: Hushåll och behörighet

- En användare ska kunna skapa ett hushåll och bjuda in minst en annan person.
- Alla fullvärdiga hushållsmedlemmar ska kunna läsa och ändra lagret.
- Det ska framgå vem som senast ändrade en post och när.
- En borttagen medlem ska förlora åtkomst till framtida data.

### FR-2: Frysplatser

- Hushållet ska kunna skapa, byta namn på och arkivera frysplatser.
- Varje aktiv lagerpost ska tillhöra exakt en plats.
- En vara ska kunna flyttas mellan platser utan att skapas på nytt.
- Sökresultat ska kunna filtreras per plats.

### FR-3: Registrering

- Appen ska stödja foto, röst och manuell text, var för sig eller kombinerade.
- Taligenkänning ska stödja svenska och vanliga svenska livsmedelsord.
- Ett AI-genererat förslag ska alltid kunna granskas före slutligt sparande.
- Användaren ska kunna spara även om endast namn och plats är kända.
- Appen ska minnas senast använda frysplats under den pågående registreringssessionen för snabb serieinmatning.

### FR-4: Bild och OCR

- Appen ska spara minst ett referensfoto per post.
- OCR ska försöka läsa produktnamn, handskriven text och datum från etiketten.
- Om flera datum hittas ska användaren få välja vad de betyder.
- Låg tilltro ska visas som ett fält som behöver bekräftelse, inte som ett osynligt automatiskt antagande.

### FR-5: Lagerpost och mängd

- En post ska minst innehålla namn, plats, skapad tid och skapande användare.
- Den ska valfritt innehålla kategori, foto, mängd, enhet, anteckning, infrysningsdatum, bäst före-datum och uppskattat ”ät före”.
- Mängd ska stödja både antal och ungefärliga enheter, exempelvis ”2 burkar”, ”1 påse” eller ”ca 500 g”.
- Användaren ska kunna duplicera en post eller öka mängden för återkommande varor.

### FR-6: Sökning och överblick

- Sökning ska matcha namn, kategori, anteckning och relevanta AI-genererade synonymer.
- Det ska gå att filtrera på plats, kategori, ”ät snart” och osäkert datum.
- Resultat ska visa namn, mängd, plats, foto/miniatyr och datumstatus utan att detaljvyn måste öppnas.
- Appen ska erbjuda en sammanlagd vy över alla frysar.

### FR-7: Förbrukning, kassation och återställning

- Användaren ska kunna minska mängden med ett fåtal tryck.
- En post ska kunna markeras som förbrukad eller kastad.
- Förbrukade/kastade poster ska lämna det aktiva lagret men finnas i historik.
- En nyligen borttagen post ska kunna återställas.
- Orsaken ”kastad” ska kunna användas för att mäta matsvinn, men får vara valfri för att inte skapa friktion.

### FR-8: Datum och ”ät snart”

- Appen ska skilja på:
  - bäst före-datum från förpackning;
  - infrysnings-/tillagningsdatum;
  - manuellt valt ”ät före”;
  - AI-uppskattat ”ät före”.
- Källan till datumet ska visas i detaljvyn.
- Om ett känt bäst före-datum saknas får appen föreslå ett intervall utifrån kategori och infrysningsdatum.
- Uppskattningar ska presenteras som rekommendationer med tydlig osäkerhet.
- Användaren ska kunna ändra eller avstå från uppskattningen.

### FR-9: Synk och konflikter

- Ändringar ska synkas automatiskt mellan hushållets enheter.
- En ändring gjord offline ska köas och synkas när anslutning återkommer.
- Om två användare ändrar samma post ska appen undvika tyst dataförlust och, vid behov, be användaren välja version.
- Det ska vara möjligt att se när lagret senast synkades.

### FR-10: Webbvy

- Webbgränssnittet ska minst stödja inloggning, sökning, filtrering och detaljvisning.
- Redigering på webben är önskvärd men kan skjutas till efter första läsbara versionen.
- Webben ska visa samma data som i mobilapparna och följa samma hushållsbehörigheter.

## 9. Informationsmodell

### 9.1 Hushåll

- `household_id`
- namn
- medlemmar och roller
- skapad tid
- inställningar för språk, notiser och standardenheter

### 9.2 Frysplats

- `location_id`
- `household_id`
- namn
- valfri beskrivning
- aktiv/arkiverad
- sorteringsordning

### 9.3 Lagerpost

- `item_id`
- `household_id`
- `location_id`
- namn
- kategori
- mängd och enhet
- foto/foton
- anteckning och originaltranskription
- infrysnings-/tillagningsdatum
- bäst före-datum
- uppskattat ”ät före” och uppskattningens underlag
- datumkälla och konfidens
- status: aktiv, förbrukad, kastad, arkiverad
- skapad/ändrad tid och användare
- versionsnummer för konfliktlösning

### 9.4 Händelse

- post skapad
- mängd ändrad
- plats ändrad
- datum ändrat
- markerad som förbrukad eller kastad
- återställd

Händelser används för synk, felsökning och återställning. De ska inte göra användargränssnittet mer administrativt.

## 10. AI- och tolkningskrav

### 10.1 Inmatning

Systemet får kombinera:

- svensk taltranskription;
- OCR av tryckt och handskriven text;
- bildklassificering av livsmedel/förpackning;
- regelbaserad datumtolkning;
- kategoribaserad uppskattning av lagringstid.

### 10.2 Tillitsmodell

- Hög tilltro: fältet fylls i och visas i vanlig bekräftelsevy.
- Medelhög tilltro: fältet fylls i men markeras för snabb kontroll.
- Låg tilltro eller motstridiga signaler: appen frågar användaren eller lämnar fältet tomt.
- Originalfoto och originaltranskription ska kunna användas för att förstå och rätta ett felaktigt förslag.

### 10.3 Säkerhetsgräns

AI:n får ge planeringsstöd men inte medicinska eller livsmedelssäkerhetsmässiga garantier. Formuleringar ska vara av typen ”prioritera”, ”uppskattat datum” och ”kontrollera varan”, inte ”säker att äta”.

## 11. Icke-funktionella krav

### 11.1 Användbarhet

- Medianregistreringen i betatest ska kunna slutföras på högst 15 sekunder.
- De vanligaste åtgärderna — lägg till, sök och förbruka — ska nås från startsidan.
- En vara ska kunna markeras som förbrukad med högst två tydliga åtgärder från sökresultatet.
- Appen ska följa iOS tillgänglighetsstöd för dynamisk text, VoiceOver, kontrast och minsta tryckyta.

### 11.2 Prestanda

- Befintligt lokalt lager ska visas inom 2 sekunder efter appstart på stödda enheter.
- Lokal sökning ska normalt ge resultat inom 300 ms.
- En synkad ändring ska normalt visas på annan online-enhet inom 5 sekunder.
- Foto- och AI-bearbetning får ske i bakgrunden, men användaren ska omedelbart se att posten tas om hand.

### 11.3 Robusthet

- Grundläggande läsning och registrering ska fungera offline.
- Appen ska inte förlora en registrering om nätverket eller AI-tjänsten är otillgänglig.
- Misslyckad bild- eller rösttolkning ska falla tillbaka till enkel manuell registrering.

### 11.4 Integritet och säkerhet

- Hushållsdata och bilder är privata och får bara vara tillgängliga för behöriga medlemmar.
- Data ska krypteras under överföring och vid lagring i backend.
- Minsta möjliga mängd personuppgifter ska samlas in.
- Användaren ska kunna exportera och radera hushållets data.
- Produktanalys ska i första hand använda aggregerade händelser och inte råa foton eller röstinspelningar.

### 11.5 Plattform

- MVP:n ska stödja moderna iPhones och aktuell iOS-version med en rimlig bakåtkompatibilitet som bestäms före utvecklingsstart.
- Webbvy ska fungera i moderna mobil- och desktopwebbläsare.

## 12. Mätetal

### 12.1 North-star-mått

**Andel registrerade varor som avslutas genom förbrukning innan de markeras som kastade eller blir inaktuella.**

Måttet speglar produktens mål, men kräver att användarna faktiskt markerar förbrukning/kassation. Därför ska det kompletteras med beteendemått.

### 12.2 Aktiveringsmått

- Hushållet har minst två skapade frysplatser.
- Minst två användare har anslutit.
- Minst fem varor har registrerats.
- Minst en användare har genomfört en sökning efter registrering.

### 12.3 Användnings- och kvalitetsmått

- Median- och 90-percentiltid för ny registrering.
- Andel registreringar som slutförs utan tangentbord.
- Andel AI-fält som rättas före sparande.
- Veckovis aktiva hushåll.
- Andel sökningar som ger ett användbart resultat.
- Andel poster som avslutas som förbrukade respektive kastade.
- Antal synkfel och konflikter per 1 000 ändringar.
- Upplevd lagertillit i återkommande användarfråga, exempelvis 1–5.

### 12.4 Föreslagna betamål

- Minst 80 % av vanliga registreringar slutförs inom 15 sekunder.
- Minst 70 % av registreringarna slutförs utan manuell långtext.
- Minst 90 % av ändringarna syns på annan online-enhet inom 5 sekunder.
- Minst 4 av 5 i upplevd enkelhet efter två veckors användning.
- Minst 70 % av beta-hushållen använder appen även vecka fyra.

## 13. MVP-acceptanskriterier

MVP:n är produktmässigt godkänd när följande scenario fungerar från början till slut:

1. Hushållsmedlem A skapar hushållet och platserna ”Frysen uppe” och ”Frysboxen nere”.
2. Hushållsmedlem B ansluter från sin iPhone och ser samma tomma lager.
3. Hushållsmedlem B fotograferar en handskriven etikett, säger ”Två burkar blåbärssylt i frysboxen nere, gjord i juli” och får ett rimligt strukturerat förslag.
4. Hushållsmedlem B kan tydligt se och rätta osäkra datum innan posten sparas.
5. Posten visas på hushållsmedlem A:s telefon inom fem sekunder när båda är online.
6. Hushållsmedlem A söker efter ”blåbär” och ser mängd, plats, foto och datumstatus.
7. Hushållsmedlem A minskar mängden från två till en utan att behöva redigera hela posten.
8. Ändringen syns hos hushållsmedlem B.
9. En vara med nära datum visas under ”Ät snart”, med tydlig markering om datumet är uppskattat.
10. Hushållsmedlem B markerar varan som förbrukad och kan därefter återställa den från historiken.
11. Samma grundflöden fungerar efter en kort offlineperiod utan dataförlust.

## 14. Risker och motåtgärder

| Risk | Konsekvens | Motåtgärd |
|---|---|---|
| Användarna glömmer att registrera uttag | Lagret tappar snabbt trovärdighet | Ett-trycks snabbåtgärder, återkommande enkel avstämning och tydlig ”senast uppdaterad” |
| Registreringen tar för lång tid | Produkten överges | Foto/röst som standard, minsta obligatoriska data, serieinmatning och mätning av registreringstid |
| AI misstolkar mat eller datum | Felaktiga köp- eller konsumtionsbeslut | Konfidensmarkering, snabb bekräftelse, originalbild/transkription och enkel rättning |
| Uppskattad hållbarhet uppfattas som säkerhetsgaranti | Säkerhets- och förtroenderisk | Tydlig källa, försiktigt språk och ingen kategorisk säkerhetsbedömning |
| Två personer ändrar samma post | Data skrivs över | Versionshantering, händelselogg och synlig konfliktlösning |
| Dålig uppkoppling vid frys eller butik | Registrering/sökning misslyckas | Lokal cache, offlinekö och senare synk |
| För många notiser | Användarna stänger av dem | Opt-in, sammanfattningar och justerbar frekvens |
| För detaljerad första version | Försenad leverans utan validerat värde | Håll MVP:n fokuserad på registrering, sökning, förbrukning, datum och synk |

## 15. Leverans- och valideringsplan

### Fas 0: klickbar prototyp

- Testa startsida, lägg till-flöde, sökning och förbrukning med de två behovsägarna.
- Mät antal tryck och faktisk tid för tre typer av varor: köpt förpackning, handskriven burk och egenlagad gryta.
- Bekräfta om foto, röst eller kombination känns naturligast i praktiken.

### Fas 1: lokal iPhone-MVP

- Två frysplatser.
- Registrering, foto, svensk röst, manuell rättning.
- Lokal sökning, datum och förbrukning.
- Ingen delning ännu; fokus på att bevisa att datan går att hålla aktuell.

### Fas 2: delat hushåll

- Inbjudan och synk mellan två iPhones.
- Offlinekö, konfliktlösning och historik.
- Intern daglig användning i minst två veckor.

### Fas 3: matsvinnsstöd

- ”Ät snart”, datumkällor och försiktiga hållbarhetsförslag.
- Opt-in-notiser eller veckosammanfattning.
- Mät användarnas tillit och hur ofta datumförslag rättas.

### Fas 4: webb och breddning

- Läsbar webbvy, därefter eventuell redigering.
- Test med fler hushåll innan recept, inköpslista eller andra lagerplatser övervägs.

## 16. Öppna frågor

Följande behöver beslutas eller valideras före full implementation:

1. Ska en fysisk handskriven datumetikett vara en rekommenderad del av hela arbetsflödet, eller ska appen kunna ersätta den?
2. Är en post normalt en behållare/förpackning eller en sammanslagen mängd av samma vara?
3. Vilka mängdenheter används mest i hushållet: antal, burk, påse, portion eller vikt?
4. Hur ofta tas bara en del av innehållet ur en behållare?
5. Ska barn kunna läsa lagret eller markera glass som förbrukad, och krävs i så fall en enklare roll?
6. Ska ”ät snart” baseras på fasta kategoriregler, ett intervall eller ett enda datum?
7. Vilken notisfrekvens skapar nytta utan irritation?
8. Är webben nödvändig vid första lansering eller räcker den delade iPhone-appen för att validera kärnvärdet?
9. Behöver originalröst sparas, eller räcker transkriptionen efter att posten har bekräftats?
10. Ska appen kunna slå ihop dubbletter automatiskt, eller endast föreslå det?
11. Hur ska hushållet göra en snabb fysisk avstämning när digitalt och faktiskt lager skiljer sig?
12. Vilken iOS-version och inloggningsmetod ska stödjas i MVP:n?

## 17. Spårbarhet till intervjun

| Intervall | Uttalat behov | PRD-konsekvens |
|---|---|---|
| 00:24–01:55 | Okänd lagerbild; egenlagat, sylt, mos, bär, grytor och glass glöms eller dubbelköps | Sökbart register, kategorier, foto och stöd för egenproducerad mat |
| 02:00–02:28 | Låg motivation att underhålla registret; foto och tal kan fungera | Foto/röst först, max 10–15 sekunder, minimalt skrivande |
| 02:36–03:56 | Analog lista är möjlig men saknar fjärråtkomst från kök och butik | Mobil, delad digital inventering med offlinestöd |
| 03:56–04:16 | Mobilapp med foto och diktafon; handskrivna lappar med datum | Bild, svensk röst, OCR och tydlig datumhantering |
| 04:16–04:47 | Två frysar, två iPhone-användare, synk och eventuell webb | Frysplatser, hushållsdelning, synk och webbvy |
| 04:48–05:27 | Minska matsvinn; läs, tala eller gissa bäst före | ”Ät snart”, datumkällor, OCR/röst och tydligt markerad uppskattning |

## 18. Antaganden som inte är uttryckliga krav

Följande är produktförslag som härletts från problemet men inte uttryckligen beställdes i intervjun:

- offlinefunktion, eftersom appen ska fungera vid frys och i butik;
- historik och återställning, eftersom mycket snabba borttagningsflöden annars blir riskabla;
- konfliktlösning, eftersom två användare kan ändra samma post;
- notiser/veckosammanfattning, som ett möjligt sätt att göra ”ät snart” handlingsbart;
- aggregerad matsvinnsmätning, för att kunna avgöra om produkten uppnår sitt syfte;
- tillgänglighets- och integritetskrav enligt normal kvalitetsnivå för en privat hushållsapp.

Dessa antaganden ska bekräftas i prototyptest och får inte göra registreringsflödet tyngre.
