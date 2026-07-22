# Roadmap och epics

## Roadmapens mål

Roadmapen tar Fryslagerappen från intervju till en liten, mätbar hushållspilot.
Den prioriterar beteendevalidering före teknisk bredd: om familjen inte orkar
registrera både infrysning och uttag är en mer avancerad produkt inte värdefull.

Planen är upplagd som tio epics. Tidsangivelserna är relativa och ska justeras
efter resultatet från varje användningstest. Epics får överlappa tekniskt, men
ingen större investering i nästa produktsteg ska göras innan föregående
valideringsgrind är passerad.

## Gemensam definition of done

En epic är klar när:

- dess användarutfall och acceptanskriterier är demonstrerade;
- relevanta enhets-, integrations- och manuella tester är gröna;
- iPhone-flödet är visuellt verifierat på stödd enhet eller simulator;
- tillgänglighet och fel-/offlinefall har kontrollerats;
- inga nya high/critical dependency- eller applikationsrisker är öppna;
- lärdomar, mätetal och beslut från användningstestet är dokumenterade;
- PRD och roadmap har uppdaterats om den validerade riktningen ändrades.

## Testdeltagare och etik

De första testerna görs med de två anonymiserade behovsägarna. Från Epic 7 bör
3–5 ytterligare hushåll rekryteras för att undvika
att produkten bara passar en familjs vanor.

Varje session ska ha:

- syfte och hypotes;
- uppgifter som deltagaren försöker lösa utan ledande instruktioner;
- samtycke till eventuell skärm-/ljudinspelning;
- noterad tid, fel, tvekan och spontana kommentarer;
- kort efterintervju och en beslutslogg;
- radering eller säker lagring av råmaterial enligt överenskommet samtycke.

## Epic 0 — Produktbaslinje och observerad verklighet

**Mål:** bekräfta att intervjuens problemformulering stämmer med hur mat faktiskt
läggs in i och tas ur hemmets frysar och torrförråd.

**Omfattning**

- Inventera frys- och torrförvaringsplatser, vanliga förpackningar, etiketter och mängdenheter.
- Definiera 10 representativa testvaror: köpt glass/fisk, bär, sylt, mos,
  färdiglagad gryta och otydligt märkt behållare.
- Skissa två lågupplösta alternativ: foto först respektive röst först.
- Etablera baslinje för dubbelköp, bortglömda varor och fysisk kontroll.

**Användningstest 1 — Kontextuell observation**

- Deltagare: de två behovsägarna, var för sig.
- Plats: kök, frysen på övervåningen, frysen i källaren och torrhyllorna.
- Uppgift: lägg in tre verkliga varor och hitta tre efterfrågade varor med
  nuvarande metod.
- Mät: tid, antal förflyttningar, vad som glöms, hur etiketter skrivs och när
  telefonen är praktisk/opraktisk.

**Valideringsgrind**

- Det finns minst tre återkommande situationer där digital fjärröverblick ger
  tydlig nytta.
- Teamet kan beskriva ett registreringsflöde som båda deltagarna tror sig kunna
  utföra i vardagen.

## Epic 1 — Körbar produktgrund

**Mål:** en reproducerbar iPhone-/webbcodebase med kvalitetsspärrar och inga
produktionshemligheter.

**Omfattning**

- Expo SDK 57, TypeScript, Expo Router och Expo Dev Client.
- Miljökonfiguration, navigationsskal och designsystemets första tokens.
- Jest, React Native Testing Library, ESLint, TypeScript-kontroll och webbundle.
- CI för lint, typer, test och dependency-audit.
- Separata development/preview/production buildprofiler.

**Acceptanskriterier**

- Ny utvecklare kan följa `docs/DEVELOPMENT.md` till en körbar app.
- iOS- och webbstart visar samma produktnamn och grundnavigation.
- Kontroller kan köras utan tillgång till hemligheter.

## Epic 2 — Prototyp av kärnloopen

**Mål:** validera snabbaste begripliga flödet för lägg till, hitta och förbruka
innan backend byggs.

**Omfattning**

- Klickbar produktnära prototyp med lokala exempeldata.
- Startsida med sökning, "Ät snart" och tydlig Lägg till-knapp.
- Foto-/röstsimulerad registrering med bekräftelsevy.
- Snabbåtgärderna Ta ut en, Ändra mängd och Förbrukad.
- Fyra platser: två frysar och två torrhyllor på övervåningen, i källaren och i ateljén.

**Användningstest 2 — Modererat prototyptest**

- Deltagare: de två behovsägarna, separat ordning.
- Uppgifter: registrera bär, kontrollera glass i butiksroll, flytta en gryta och
  markera en burk som förbrukad.
- Mät: task success, tid, antal tryck, fel, förståelse för datumkällor och SUS-lite.
- Målvärde: minst 4 av 5 uppgifter utan hjälp; ingen vanlig registrering över
  20 sekunder i prototypen.

**Valideringsgrind**

- Ett huvudflöde (foto först, röst först eller kombination) väljs.
- Osäkra AI-fält kan förklaras utan utbildning.

## Epic 3 — Lokal inventering och offlinekärna

**Mål:** appen ska vara användbar med verkliga data även utan nätverk.

**Omfattning**

- SQLite-modell för hushåll, platser, lagerposter och händelser.
- Skapa, läsa, ändra, flytta, minska, förbruka och återställa poster.
- Lokal sökning och filter per plats/kategori/status.
- Seed-/demodata och migreringsstrategi.
- Synkkö och versionsfält, utan aktiv remote-sync ännu.

**Acceptanskriterier**

- Alla kärnåtgärder fungerar i flygplansläge.
- Appen återstartar utan dataförlust.
- En felaktig borttagning kan återställas.
- Sökning i 1 000 poster svarar inom produktens prestandamål.

## Epic 4 — Foto, svensk röst och bekräftelse

**Mål:** verklig registrering ska normalt gå snabbare än att skriva en lista.

**Omfattning**

- Kamera, bildbibliotek och lokal röstinspelning.
- Utbytbara gränssnitt för OCR, transkription och strukturerad extraktion.
- Förslag på namn, kategori, mängd, plats och datum.
- Konfidensnivåer och en kompakt bekräftelsevy.
- Fallback när nätverk eller AI-tjänst saknas.
- Policy för när råbild/röst sparas eller raderas.

**Användningstest 3 — Registrering vid frysen**

- Deltagare: de två behovsägarna.
- Material: minst 10 representativa verkliga varor.
- Miljö: stående vid respektive frys, med normala störningar och händer upptagna.
- Mät: median/P90-tid, korrekt strukturerade fält, rättningar, övergivna flöden
  och upplevd ansträngning.
- Målvärde: median högst 15 sekunder; minst 80 % sparade poster användbara efter
  högst en rättning.

**Valideringsgrind**

- Båda behovsägarna föredrar flödet framför en handskriven digital lista.
- Fel och osäkerheter är synliga innan de påverkar lagret.

## Epic 5 — Delat hushåll och synk

**Mål:** två personer ska kunna lita på samma lager utan tyst dataförlust.

**Omfattning**

- Självhostad PocketBase på M5 med auth, hushållsregler och realtid.
- Skapa hushåll och säker inbjudan till en medlem.
- Delta-synk mellan SQLite och backend.
- Realtime-uppdatering, retry och konflikthantering.
- Synlig senast-synkad-status och ändringshistorik.

**Användningstest 4 — Tvåpersoners samtidighet**

- Deltagare: de två behovsägarna med varsin iPhone.
- Uppgifter: lägg till samtidigt, ändra samma post, arbeta offline på en telefon,
  återanslut och verifiera slutresultatet.
- Mät: förlorade ändringar, förståelse för synkstatus och tid tills den andra
  enheten visar ändringen.
- Målvärde: ingen tyst dataförlust; normal onlinesynk inom 5 sekunder.

## Epic 6 — Sökning i köket och butiken

**Mål:** frågan "har vi X?" ska besvaras på några sekunder.

**Omfattning**

- Direkt tillgängligt sökfält och röst-/textsökning.
- Matchning av namn, kategori, anteckning och försiktiga synonymer.
- Resultat med mängd, plats, miniatyr och datumstatus.
- Filter för förvaringsplats, kategori och "ät snart".
- Dubblettvarning som förslag, inte blockerande regel.

**Användningstest 5 — Butikssimulering**

- Deltagare: de två behovsägarna och 2 nya hushållsanvändare.
- Uppgift: fatta sex köpbeslut från en simulerad inköpslista under tidspress.
- Mät: rätt beslut, tid till svar, nollresultat och behov av att öppna detaljvy.
- Målvärde: median under 5 sekunder till användbart svar.

## Epic 7 — Datum, "Ät snart" och matsvinn

**Mål:** hjälpa hushållet att välja vad som bör ätas först utan att ge falska
livsmedelssäkerhetsgarantier.

**Omfattning**

- Separata datumtyper och tydlig källmarkering.
- OCR/manuellt datum och försiktigt uppskattat intervall.
- Prioriterad "Ät snart"-vy.
- Valbar veckosammanfattning; inga påträngande standardnotiser.
- Händelsen kastad som frivill matsvinnssignal.

**Användningstest 6 — Tvåveckors dagboksstudie**

- Deltagare: de två behovsägarna och 3–5 pilot-hushåll.
- Upplägg: använd appen i vardagen i 14 dagar, med kort daglig fråga och
  intervju dag 1, 7 och 14.
- Mät: lagerprecision, registreringsgrad, användning av "Ät snart", förbrukat
  kontra kastat, notisreaktion och upplevd tillit.
- Målvärde: minst 70 % av hushållen aktiva vecka två; genomsnittlig tillit minst
  4 av 5; inga rapporter om att uppskattningar tolkats som säkerhetsgaranti.

**Valideringsgrind**

- Kärnloopen används utan daglig påminnelse från utvecklaren.
- Matsvinnsstödet leder till handling och inte bara information.

## Epic 8 — Webbvy och tillgänglighet

**Mål:** ge snabb överblick på större skärm och säkerställa att kärnflödena är
tillgängliga.

**Omfattning**

- Responsiv, inloggad läsvy med sökning och filter.
- Beslut om redigering på webben baserat på faktisk efterfrågan.
- VoiceOver, dynamisk text, kontrast, fokusordning och reducerad rörelse.
- Tangentbordsnavigering på webben.

**Användningstest 7 — Tillgänglighetsgenomgång**

- Deltagare: minst en person som regelbundet använder skärmläsare eller stora
  textstorlekar, utöver behovsägarna.
- Uppgifter: sök, tolka resultat, lägg till med alternativ inmatning och
  markera förbrukad.
- Mät: blockerare, fokusfel, begriplighet och felåterhämtning.

## Epic 9 — Pilotberedskap och release candidate

**Mål:** en säker och supportbar pilot som kan användas utan utvecklaren bredvid.

**Omfattning**

- App Store Connect/TestFlight, privacy manifest och permission copy.
- Backup/export/radering, onboarding och felsökningsstöd.
- Observability utan råa foton, ljud, matdata eller hemligheter i loggar.
- Hotmodell, RLS-verifiering, dependency-review och återställningsövning.
- Produktanalys endast för de mått som beslutats och kommunicerats.

**Användningstest 8 — Omodererad release candidate**

- Deltagare: 5 hushåll som inte deltagit i utvecklingen.
- Upplägg: installation via TestFlight, onboarding utan hjälp och sju dagars
  användning med support endast via dokumenterad kanal.
- Mät: aktivering, blockerande fel, supportbehov, retention dag 7 och
  genomförande av lägg till/sök/förbruka.

**Releasegrind**

- Inga blockerande säkerhets-, integritets- eller dataförlustfel.
- Minst 4 av 5 hushåll når aktivering utan direkt hjälp.
- North-star- och kvalitetsmått kan mätas utan att samla onödigt innehåll.

## Grov ordning och beroenden

| Period | Epics | Primärt beslut |
|---|---|---|
| Vecka 1 | 0–1 | Är problemet och miljön korrekt förstådda? |
| Vecka 2 | 2 | Vilken kärnloop är begriplig och snabbast? |
| Vecka 3–4 | 3–4 | Går lagret att hålla aktuellt med verkliga varor? |
| Vecka 5–6 | 5–6 | Kan två personer lita på samma data och använda den i butik? |
| Vecka 7–9 | 7 | Påverkar produkten faktisk konsumtion/matsvinn över tid? |
| Vecka 8–10 | 8 | Behövs webben, och är kärnan tillgänglig? |
| Vecka 10–12 | 9 | Är piloten säker, begriplig och supportbar? |

## Beslutspunkter

1. Efter test 1: fortsätt digitalt eller prova en hybrid med fysisk märkning.
2. Efter test 2: lås huvudflödet för registrering.
3. Efter test 3: fortsätt med AI-stödet, förenkla det eller gå tillbaka till
   mer deterministisk inmatning.
4. Efter test 4: godkänn synkmodellen innan extern pilotdata tas in.
5. Efter test 6: avgör om appen ändrar vardagsbeteendet tillräckligt för pilot.
6. Efter test 8: besluta om fortsatt pilot, omtag eller avveckling.
