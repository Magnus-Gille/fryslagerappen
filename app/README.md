# Fryslagerappen — app

Expo/React Native-klienten för Fryslagerappen. Läs först projektets
[`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md) och
[`docs/ROADMAP.md`](../docs/ROADMAP.md).

## Kom igång

1. Använd Node 24 LTS och installera dependencies:

   ```bash
   npm install
   ```

2. Kör kvalitetskontroller:

   ```bash
   npm run doctor
   npm run lint
   npm run typecheck
   npm test
   ```

3. Starta appen:

   ```bash
   npm start
   ```

SDK 57-utveckling sker primärt med iOS Simulator eller Expo Dev Client.
Källkod ligger i `src/`. Lägg inte testfiler i `src/app`, eftersom Expo Router
tolkar filer där som routes.
