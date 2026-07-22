# Demo: foto eller röst till delat lager

Den mest värdefulla demon är nu den riktiga kärnloopen:

1. logga in och välj eller skapa ett Home;
2. tryck direkt på **Foto** eller **Röst** på startsidan;
3. låt M5 tolka etiketten eller den svenska beskrivningen;
4. kontrollera namn, mängd, förvaringsplats och datum;
5. bekräfta och se lagret uppdateras för hemmets medlemmar.

Ingen råbild, ljudfil eller transkription sparas. Inventeringen ändras inte
förrän användaren har bekräftat förslaget.

## Kör demon i iOS Simulator

M5:s PocketBase lyssnar bara på loopback tills Tailscale Serve har fått sin
engångsapproval. Simulatorn kan ändå använda backend genom en lokal SSH-tunnel.

Terminal 1:

```bash
./scripts/start-m5-tunnel.sh
```

`app/.env.local` ska innehålla:

```dotenv
EXPO_PUBLIC_ICEAGE_API_URL=http://127.0.0.1:18090
```

Terminal 2:

```bash
cd app
npm run ios
```

Välj **Foto** och sedan **Välj foto** i Simulator. Det går då att köra den
riktiga M5-tolkningen på en syntetisk eller uttryckligen godkänd etikettbild,
även när Simulator saknar användbar kamera.

## Förslag på tvåminutersdemo

- Visa Home-inställningarna och de fem startplatserna: två frysar, två
  torrhyllor och ett kylskåp.
- Välj **Foto**, importera en etikettbild och kontrollera M5:s förslag innan du
  sparar.
- Välj **Röst** och säg exempelvis “ta ut en påse lax från frysen i källaren”.
- Sök efter varan och filtrera på förvaringsplats.
- Visa historiken och, med en andra inloggad klient, realtime-uppdateringen.

## Ärliga begränsningar

- En fysisk iPhone behöver den privata Tailscale Serve-adressen eller en annan
  godkänd privat nätverksväg. Den lokala Simulator-tunneln fungerar inte från
  telefonen.
- Appen har ännu inte den planerade SQLite-persistensen och synkkön. I
  autentiserat läge är PocketBase källan till lagret; utan backend används bara
  omstartningsbar demodata.
- Tvåpersoners användningstest och fysisk installation återstår och ska inte
  förväxlas med den automatiserade realtime-verifieringen.
