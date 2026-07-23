# Fryslagerappen

En delad, iPhone-först heminventering för kyl-, frys- och torrvaror som ska göra
det snabbt att registrera, hitta och använda mat innan den glöms bort.

Projektet är i produktgrund- och prototypfas. Kärnan är en lågfriktionsupplevelse
med foto, svensk röstinmatning, valfritt många typade förvaringsplatser, delning
mellan hemmets medlemmar och tydligt markerade "ät snart"-rekommendationer.

## Dokument

- [Produktkrav](./PRD-fryslagerappen.md)
- [Roadmap och epics](./docs/ROADMAP.md)
- [Utvecklingsmiljö](./docs/DEVELOPMENT.md)
- [Körbar tvåminutersdemo](./docs/DEMO.md)
- [Dela appen via TestFlight](./docs/TESTFLIGHT.md)

## Teknik

- Expo SDK 57 / React Native 0.86 / React 19
- TypeScript och Expo Router för iPhone och en framtida webbvy
- Expo SQLite installerat inför den planerade offline-kärnan
- Självhostad PocketBase på M5 för autentisering, behörighet, lagring och realtid
- Lokal Whisper och multimodal modell på M5, med Orin Nano som valfri worker
- Kontextmedveten feedback i varje appflöde, privat lagrad på M5
- Jest, React Native Testing Library och ESLint
- Expo Dev Client och EAS-konfiguration för utvecklingsbyggen

## Kom igång

Krav: macOS, Xcode och Node.js 24 LTS.

```bash
cd app
npm install
npm run doctor
npm run typecheck
npm test
npm run ios
```

Appen använder inga produktionshemligheter i repot. Kopiera
`app/.env.example` till `app/.env.local` och ange den tailnet-privata HTTPS-URL
som `scripts/deploy-m5.sh` skapar. Konton, media och lagerdata lämnar inte den
privata infrastrukturen.

Den publika GitHub Pages-versionen byggs avsiktligt utan den privata
serveradressen och fortsätter därför som ett lokalt demo. Den riktiga
delningsfunktionen aktiveras bara i privata native-byggen.

## Licens

Projektet är öppen källkod under [MIT-licensen](./LICENSE). Tredjepartskod och
mallresurser behåller sina respektive licenser.

## Integritet

Det råa röstmemot och transkriptet är avsiktligt ignorerade av Git. PRD:n är
den delbara och versionshanterade sammanställningen av användarbehoven.

Shared, low-friction freezer inventory for iPhone and web
