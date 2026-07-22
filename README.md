# Fryslagerappen

En delad, iPhone-först frysinventering som ska göra det snabbt att registrera,
hitta och äta upp mat innan den glöms bort.

Projektet är i produktgrund- och prototypfas. Kärnan är en lågfriktionsupplevelse
med foto, svensk röstinmatning, flera frysplatser, delning mellan
hushållsmedlemmar och tydligt markerade "ät snart"-rekommendationer.

## Dokument

- [Produktkrav](./PRD-fryslagerappen.md)
- [Roadmap och epics](./docs/ROADMAP.md)
- [Utvecklingsmiljö](./docs/DEVELOPMENT.md)

## Teknik

- Expo SDK 57 / React Native 0.86 / React 19
- TypeScript och Expo Router för iPhone och en framtida webbvy
- Expo SQLite för lokal/offline data
- Supabase för autentisering, lagring, delning och synk
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
`app/.env.example` till `app/.env.local` när en separat utvecklingsmiljö i
Supabase har skapats.

## Licens

Projektet är öppen källkod under [MIT-licensen](./LICENSE). Tredjepartskod och
mallresurser behåller sina respektive licenser.

## Integritet

Det råa röstmemot och transkriptet är avsiktligt ignorerade av Git. PRD:n är
den delbara och versionshanterade sammanställningen av användarbehoven.

Shared, low-friction freezer inventory for iPhone and web
