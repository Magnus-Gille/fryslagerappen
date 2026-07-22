routerAdd("GET", "/api/iceage/health", (e) => {
  return e.json(200, { status: "ok", service: "iceage", inference: "local" });
});

routerAdd("POST", "/api/iceage/signup", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const body = lib.body(e);
  const email = lib.text(body.email, "e-post", 254).toLowerCase();
  const password = String(body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestError("Ogiltig e-postadress.");
  if (password.length < 12 || password.length > 128) {
    throw new BadRequestError("Lösenordet måste vara minst 12 tecken.");
  }

  const user = new Record(e.app.findCollectionByNameOrId(lib.collections.users));
  user.setEmail(email);
  user.setPassword(password);
  user.set("displayName", email.split("@")[0].slice(0, 80));
  user.setEmailVisibility(false);
  e.app.save(user);
  return $apis.recordAuthResponse(e, user, "password");
}, $apis.requireGuestOnly(), $apis.bodyLimit(16 * 1024));

routerAdd("POST", "/api/iceage/households", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  if (e.auth.getString("household")) throw new BadRequestError("Kontot tillhör redan ett hushåll.");
  const body = lib.body(e);
  const name = lib.text(body.name, "hushållsnamn", 80);
  const displayName = lib.text(body.displayName, "namn", 80);
  let householdId = "";

  e.app.runInTransaction((txApp) => {
    const household = new Record(txApp.findCollectionByNameOrId(lib.collections.households));
    household.set("name", name);
    household.set("owner", e.auth.id);
    txApp.save(household);
    householdId = household.id;

    for (const locationData of [
      { name: "Frysen uppe", description: "Köket", position: 0 },
      { name: "Frysboxen nere", description: "Källaren", position: 1 },
    ]) {
      const location = new Record(txApp.findCollectionByNameOrId(lib.collections.locations));
      location.set("household", household.id);
      location.set("name", locationData.name);
      location.set("description", locationData.description);
      location.set("position", locationData.position);
      txApp.save(location);
    }

    const user = txApp.findRecordById(lib.collections.users, e.auth.id);
    user.set("household", household.id);
    user.set("householdRole", "owner");
    user.set("displayName", displayName);
    txApp.save(user);
  });

  return e.json(200, { householdId: householdId });
}, $apis.requireAuth("users"), $apis.bodyLimit(16 * 1024));

routerAdd("POST", "/api/iceage/households/{id}/invites", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const householdId = lib.household(e);
  if (e.request.pathValue("id") !== householdId || e.auth.getString("householdRole") !== "owner") {
    throw new ForbiddenError("Endast hushållets ägare kan bjuda in.");
  }

  const token = $security.randomString(32);
  const invitation = new Record(e.app.findCollectionByNameOrId(lib.collections.invitations));
  invitation.set("household", householdId);
  invitation.set("tokenHash", $security.sha256(token));
  invitation.set("invitedBy", e.auth.id);
  invitation.set("expiresAt", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
  e.app.save(invitation);
  return e.json(200, { token: token });
}, $apis.requireAuth("users"), $apis.bodyLimit(8 * 1024));

routerAdd("POST", "/api/iceage/invites/accept", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  if (e.auth.getString("household")) throw new BadRequestError("Kontot tillhör redan ett hushåll.");
  const body = lib.body(e);
  const token = lib.text(body.token, "inbjudningskod", 128);
  const displayName = lib.text(body.displayName, "namn", 80);
  const tokenHash = $security.sha256(token);

  e.app.runInTransaction((txApp) => {
    const invitation = txApp.findFirstRecordByFilter(
      lib.collections.invitations,
      "tokenHash = {:hash} && acceptedAt = '' && expiresAt > @now",
      { hash: tokenHash },
    );
    const user = txApp.findRecordById(lib.collections.users, e.auth.id);
    user.set("household", invitation.getString("household"));
    user.set("householdRole", "member");
    user.set("displayName", displayName);
    txApp.save(user);
    invitation.set("acceptedAt", new Date().toISOString());
    invitation.set("acceptedBy", user.id);
    txApp.save(invitation);
  });

  return e.json(200, { accepted: true });
}, $apis.requireAuth("users"), $apis.bodyLimit(16 * 1024));

routerAdd("POST", "/api/iceage/items", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const householdId = lib.household(e);
  const body = lib.body(e);
  const locationId = lib.text(body.locationId, "frysplats", 32);
  lib.location(e.app, locationId, householdId);
  const dateSource = String(body.dateSource || "none");
  if (!["manual", "label", "estimated", "none"].includes(dateSource)) {
    throw new BadRequestError("Ogiltig datumkälla.");
  }

  let itemResult = null;
  e.app.runInTransaction((txApp) => {
    const item = new Record(txApp.findCollectionByNameOrId(lib.collections.items));
    item.set("household", householdId);
    item.set("location", locationId);
    item.set("name", lib.text(body.name, "namn", 120));
    item.set("category", lib.text(body.category, "kategori", 80));
    item.set("quantity", lib.number(body.quantity, "antal", 0.01, 100000));
    item.set("unit", lib.text(body.unit, "enhet", 40));
    item.set("frozenOn", lib.date(body.frozenOn));
    item.set("eatBefore", lib.date(body.eatBefore));
    item.set("dateSource", dateSource);
    item.set("note", lib.optionalText(body.note, 500));
    item.set("status", "active");
    item.set("createdBy", e.auth.id);
    item.set("updatedBy", e.auth.id);
    item.set("version", 1);
    txApp.save(item);
    lib.event(txApp, householdId, item.id, "created", e.auth.id);
    itemResult = lib.publicRecord(item);
  });
  return e.json(201, { item: itemResult });
}, $apis.requireAuth("users"), $apis.bodyLimit(64 * 1024));

routerAdd("POST", "/api/iceage/items/{id}/mutate", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const householdId = lib.household(e);
  const body = lib.body(e);
  const action = String(body.action || "");
  const expectedVersion = lib.number(body.expectedVersion, "version", 1, 1000000000);
  let itemResult = null;

  e.app.runInTransaction((txApp) => {
    const item = txApp.findRecordById(lib.collections.items, e.request.pathValue("id"));
    if (item.getString("household") !== householdId) throw new ForbiddenError();
    if (item.getInt("version") !== expectedVersion) {
      throw new ApiError(409, "Lagret ändrades på en annan enhet. Försök igen.");
    }

    let eventType = "quantityChanged";
    if (action === "remove") {
      const amount = lib.number(body.quantity, "antal", 0, 100000);
      const nextQuantity = Math.max(0, item.getFloat("quantity") - amount);
      item.set("quantity", nextQuantity);
      if (nextQuantity === 0) {
        item.set("status", "consumed");
        eventType = "consumed";
      }
    } else if (action === "move") {
      const locationId = lib.text(body.locationId, "frysplats", 32);
      lib.location(txApp, locationId, householdId);
      item.set("location", locationId);
      eventType = "moved";
    } else if (action === "consume") {
      item.set("status", "consumed");
      eventType = "consumed";
    } else if (action === "restore") {
      item.set("status", "active");
      item.set("quantity", Math.max(1, item.getFloat("quantity")));
      eventType = "restored";
    } else {
      throw new BadRequestError("Okänd lagerändring.");
    }

    item.set("updatedBy", e.auth.id);
    item.set("version", expectedVersion + 1);
    txApp.save(item);
    lib.event(txApp, householdId, item.id, eventType, e.auth.id);
    itemResult = lib.publicRecord(item);
  });
  return e.json(200, { item: itemResult });
}, $apis.requireAuth("users"), $apis.bodyLimit(16 * 1024));

routerAdd("POST", "/api/iceage/extract", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const householdId = lib.household(e);
  const body = lib.body(e);
  if (String(body.householdId || "") !== householdId) throw new ForbiddenError();
  lib.consumeExtractionQuota(e.app, e.auth.id);

  const photoBase64 = String(body.photoBase64 || "");
  const photoMimeType = String(body.photoMimeType || "image/jpeg");
  if (photoBase64.length > 7_000_000) throw new ApiError(413, "Bilden är för stor.");
  if (photoBase64 && !["image/jpeg", "image/png", "image/webp"].includes(photoMimeType)) {
    throw new BadRequestError("Bildformatet stöds inte.");
  }
  const audioFiles = lib.optionalUploadedFiles(e, "audio");
  if (audioFiles.length > 1) throw new BadRequestError("Skicka högst ett ljudklipp.");
  const transcript = audioFiles.length === 1 ? lib.transcribe(audioFiles[0]) : "";
  if (!photoBase64 && !transcript) throw new BadRequestError("Ta en bild eller spela in en beskrivning.");

  const locations = e.app.findRecordsByFilter(lib.collections.locations, "household = {:household} && archivedAt = ''", "position", 50, 0, { household: householdId });
  const items = e.app.findRecordsByFilter(lib.collections.items, "household = {:household} && status = 'active'", "-updated", 200, 0, { household: householdId });
  const context = [
    "Datum: " + new Date().toISOString().slice(0, 10) + ".",
    "Frysplatser: " + locations.map((location) => location.getString("name")).join(", ") + ".",
    "Aktivt lager: " + JSON.stringify(items.map((item) => ({
      name: item.getString("name"),
      quantity: item.getFloat("quantity"),
      unit: item.getString("unit"),
    }))) + ".",
    transcript ? "Svensk transkription: " + transcript : "Ingen röstbeskrivning.",
    "Tolka avsikten. Matcha borttag, förbrukning eller flytt mot ett befintligt namn när det är tydligt.",
    "Gissa aldrig ett tryckt datum. Ett uppskattat ät-före-datum ska markeras estimated.",
    "Markera varje osäkert fält. Svara på svenska.",
  ].join("\n");
  const intent = lib.extractIntent(context, photoBase64, photoMimeType);
  intent.transcript = transcript || null;
  return e.json(200, { intent: intent });
}, $apis.requireAuth("users"), $apis.bodyLimit(20 * 1024 * 1024));
