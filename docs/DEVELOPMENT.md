# Utvecklingsmiljö

## Beslutad startstack

Appen byggs med Expo SDK 57 och TypeScript. Det ger en iPhone-först produkt,
stöd för native kamera/ljud/notiser och en väg till webb utan att två separata
frontendkodbaser behöver startas i produktens osäkra tidiga fas.

Node.js 24.18.0 LTS används. Node 26 är installerad på utvecklingsmaskinen men
är en Current-version; Expo rekommenderar LTS för projektutveckling.

### Installerat i appen

- `expo-camera` och `expo-image-picker`: foto och etikettinläsning
- `expo-audio`: lokal röstinspelning
- `expo-sqlite`: offline-first lager och synkkö
- `expo-secure-store`: säkra sessionsuppgifter
- `expo-notifications`: valbara "ät snart"-påminnelser
- `expo-network`: nätverksmedveten synk
- `expo-dev-client`: iPhone-utvecklingsbygge med native moduler
- `pocketbase`: klient för autentisering, hushållsbehörighet, data och realtime
- `react-native-sse`: realtime-transport i React Native
- `@tanstack/react-query`: server-state och synkstatus
- `zod`: validering vid app- och API-gränser
- Jest, React Native Testing Library och ESLint: automatiska kvalitetskontroller

Stacken är ett startbeslut, inte ett krav på att färdigställa all backend innan
prototyp- och användningstester. Gränssnitten mot tal-, bild- och synktjänster
ska hållas utbytbara.

## Förutsättningar

- macOS och Xcode 26 eller senare
- Node.js 24.18.0 LTS
- npm 11
- CocoaPods 1.17 eller senare för lokala native iOS-byggen
- Ett Apple-utvecklarkonto först när fysisk distribution krävs
- Tailscale-åtkomst till M5 för det autentiserade läget

Appidentifierarna i `app/app.json` använder `ai.gille.fryslagerappen` för både
iOS och Android.

Node 24 är installerad via Homebrew som keg-only. Om `node --version` visar en
annan version kan rätt verktyg användas för den aktuella terminalen med:

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
```

Repot innehåller även `.node-version` och `.nvmrc` för versionshanterare.
Watchman är inte ett krav för Expo SDK 57.

## Installation

```bash
cd app
npm install
cp .env.example .env.local
```

Fyll inte i produktionshemligheter. `EXPO_PUBLIC_ICEAGE_API_URL` är endast den
tailnet-privata serveradressen; PocketBase adminuppgifter och
inferencekonfiguration stannar på M5.

## M5, autentisering och AI-tolkning

1. Kontrollera att telefonen och utvecklingsmaskinen är anslutna till Magnus
   Tailscale-tailnet.
2. Deploya den pinnade, checksummeverifierade PocketBase-versionen till M5.
3. Lägg M5:s Tailscale Serve-URL i `app/.env.local`.

```bash
./scripts/deploy-m5.sh
printf '%s\n' 'EXPO_PUBLIC_ICEAGE_API_URL=https://m5.example-tailnet.ts.net' > app/.env.local
```

Om URL:en saknas kör appen det befintliga lokala demoläget; foto, röst,
inloggning och delning är då avsiktligt avstängda.

GitHub Pages exporteras alltid utan backend-URL. Att lägga tailnet-adressen i
en publik webb-bundle skulle röja privat infrastruktur även om Tailscale
fortfarande blockerar åtkomst. Använd privata native-byggen för autentiserat
läge.

Autentisering sker med e-post och lösenord mot PocketBase på M5.
Native-sessionen lagras i iOS Keychain/Android Keystore via
`expo-secure-store`. Collection rules begränsar läsning till det autentiserade
hushållet och alla skrivningar går genom validerade serverroutes. Foto och ljud
skickas till en autentiserad route och vidare till M5:s Whisper/llama-swap men
lagras inte av appen eller backend.

## Kontroller

Kör före varje push:

```bash
npm run doctor
npm run lint
npm run typecheck
npm test
```

Webbens statiska bundle kan verifieras med:

```bash
npm run build:web
```

## Köra lokalt

```bash
# Metro och utvecklingsmeny
npm start

# iOS Simulator
npm run ios

# webbläsare
npm run web
```

SDK 57 ligger före den Expo Go-version som används under övergångsperioden.
Native utveckling ska därför använda Expo Dev Client/iOS Simulator i stället
för att göra Expo Go till ett krav.

## Utvecklingsbyggen

När Expo-/Apple-konton är kopplade:

```bash
npx eas-cli build --profile development --platform ios
```

`eas.json` definierar development, preview och production. Ingen build får
använda produktionsdata under användningstestning.

## Dataskydd i utveckling

- Råa användarintervjuer, foton och ljud ska inte versionshanteras.
- Testdata ska vara syntetisk eller uttryckligen godkänd för ändamålet.
- Röstfiler ska raderas efter transkription när originalet inte behövs.
- Logga aldrig signed URLs, sessionsuppgifter eller tal-/bildinnehåll.
- Telemetri ska vara avstängd tills en mätplan och samtyckestext har godkänts.

## Känd dependency-audit

Den initiala installationen rapporterar 11 moderata advisories i Expo SDK 57:s
verktygskedja. De härleds via Expo CLI/config-plugins och `xcode`/`uuid`.
`npm audit` föreslår en felaktig nedgradering till Expo 46 som "fix" och ska
inte köras med `--force`. Det finns inga rapporterade high eller critical.
Läget ska omprövas när Expo publicerar kompatibla patchar och före pilot.
