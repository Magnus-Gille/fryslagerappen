# Dela Fryslagerappen med Sara

Den nuvarande piloten använder **intern TestFlight-testning**. Det är rätt väg
så länge PocketBase på M5 bara kan nås via den privata Tailscale-tailneten.
Extern TestFlight-testning skulle kräva Apples betagranskning, men granskarnas
telefoner kan inte nå den privata backendservern.

## Det Magnus gör en gång

### 1. Ge Sara begränsad App Store Connect-åtkomst

1. Öppna [Users and Access](https://appstoreconnect.apple.com/access/users).
2. Lägg till Sara med den e-postadress hon använder för sitt Apple-konto.
3. Välj rollen **Marketing** och ge bara åtkomst till **Fryslagerappen** om
   App Store Connect visar appvalet.
4. Be Sara acceptera Apples e-postinbjudan.

Detta gör henne till intern testare utan administratörs- eller
utvecklarbehörighet. Använd inte en publik TestFlight-länk i den här privata
pilotfasen.

### 2. Lägg Sara i TestFlight-gruppen

1. Öppna **Fryslagerappen → TestFlight** i App Store Connect.
2. Skapa den interna gruppen **Familjen** om den inte redan finns.
3. Lägg till den senast behandlade versionen och välj Sara som testare.

Sara får därefter en TestFlight-inbjudan från Apple.

### 3. Ge Saras telefon åtkomst till M5

1. Bjud in Sara som användare från Tailscales adminpanel.
2. Installera **Tailscale** från App Store på hennes iPhone.
3. Låt henne logga in med den inbjudna identiteten och godkänn telefonen i
   adminpanelen om det efterfrågas.
4. Kontrollera att Tailscale visar **Connected** innan Fryslagerappen öppnas.

TestFlight distribuerar själva appen. Tailscale behövs separat för inloggning,
delat lager, realtidsuppdateringar och testtelemetri mot M5.

## Det Sara gör

1. Acceptera först inbjudan till App Store Connect.
2. Installera [TestFlight](https://apps.apple.com/app/testflight/id899247664).
3. Acceptera TestFlight-inbjudan till Fryslagerappen och tryck **Install**.
4. Starta Tailscale och kontrollera att den är ansluten.
5. Öppna Fryslagerappen och välj **Sign in with Apple**.
6. Magnus skapar ett Home och bjuder in Sara, eller bjuder in henne till det
   befintliga hemmet, så ser båda samma lager i realtid.

## Ladda upp en ny version

Från repots rot:

```bash
./scripts/upload-testflight.sh
```

Skriptet kräver den privata HTTPS-adressen i `app/.env.local`, genererar ett
stigande buildnummer, skapar en signerad App Store-archive och laddar upp den
till App Store Connect. Inga Apple-nycklar eller backendhemligheter skrivs till
repot. När Apple har behandlat bygget väljs det i gruppen **Familjen**.

Telefonloggar för testfasen kan läsas utan telefonkabel med:

```bash
./scripts/show-phone-telemetry.sh
```

## Vanliga problem

- **Backend unavailable:** kontrollera att Tailscale är anslutet på telefonen.
- **Ingen TestFlight-inbjudan:** kontrollera att både bygget och Sara är
  tillagda i gruppen **Familjen**.
- **Nytt bygge syns inte:** vänta tills App Store Connect har behandlat
  uppladdningen och ladda om TestFlight-sidan.
- **Sign in with Apple misslyckas:** notera klockslaget och läs telemetrin med
  skriptet ovan.
