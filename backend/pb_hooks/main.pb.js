onBootstrap((e) => {
  e.next();

  const clientId = $os.getenv("ICEAGE_APPLE_CLIENT_ID").trim();
  const clientSecret = $os.getenv("ICEAGE_APPLE_CLIENT_SECRET").trim();
  if (!clientId && !clientSecret) return;
  if (!clientId || !clientSecret) {
    throw new Error("ICEAGE_APPLE_CLIENT_ID and ICEAGE_APPLE_CLIENT_SECRET must be configured together");
  }

  const users = e.app.findCollectionByNameOrId("users");
  users.oauth2.enabled = true;
  users.oauth2.providers = [{
    name: "apple",
    clientId: clientId,
    clientSecret: clientSecret,
    pkce: false,
  }];
  users.oauth2.mappedFields.name = "displayName";
  e.app.save(users);
});

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

function createHome(e) {
  const lib = require(__hooks + "/lib/iceage.js");
  if (e.auth.getString("household")) throw new BadRequestError("Kontot tillhör redan ett hem.");
  const body = lib.body(e);
  const name = lib.text(body.name, "hemmets namn", 80);
  const displayName = lib.text(body.displayName, "namn", 80);
  let homeId = "";

  e.app.runInTransaction((txApp) => {
    const home = new Record(txApp.findCollectionByNameOrId(lib.collections.households));
    home.set("name", name);
    home.set("owner", e.auth.id);
    txApp.save(home);
    homeId = home.id;

    for (const locationData of [
      { name: "Frysen på övervåningen", description: "Övervåningen", storageType: "freezer", position: 0 },
      { name: "Frysen i källaren", description: "Källaren", storageType: "freezer", position: 1 },
      { name: "Hyllan på övervåningen", description: "Torrvaror på övervåningen", storageType: "dry", position: 2 },
      { name: "Hyllan i ateljén", description: "Torrvaror i ateljén", storageType: "dry", position: 3 },
      { name: "Kylskåpet på övervåningen", description: "Kylda varor på övervåningen", storageType: "fridge", position: 4 },
    ]) {
      const location = new Record(txApp.findCollectionByNameOrId(lib.collections.locations));
      location.set("household", home.id);
      location.set("name", locationData.name);
      location.set("description", locationData.description);
      location.set("storageType", locationData.storageType);
      location.set("position", locationData.position);
      txApp.save(location);
    }

    const user = txApp.findRecordById(lib.collections.users, e.auth.id);
    user.set("household", home.id);
    user.set("householdRole", "owner");
    user.set("displayName", displayName);
    txApp.save(user);
  });

  return e.json(200, { homeId: homeId, householdId: homeId });
}

routerAdd("POST", "/api/iceage/homes", createHome, $apis.requireAuth("users"), $apis.bodyLimit(16 * 1024));
routerAdd("POST", "/api/iceage/households", createHome, $apis.requireAuth("users"), $apis.bodyLimit(16 * 1024));

routerAdd("PATCH", "/api/iceage/homes/{id}", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const homeId = lib.requireHomeOwner(e, e.request.pathValue("id"));
  const home = e.app.findRecordById(lib.collections.households, homeId);
  home.set("name", lib.text(lib.body(e).name, "hemmets namn", 80));
  e.app.save(home);
  return e.json(200, { home: lib.publicRecord(home) });
}, $apis.requireAuth("users"), $apis.bodyLimit(16 * 1024));

routerAdd("GET", "/api/iceage/homes/{id}/members", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const homeId = lib.requireHome(e, e.request.pathValue("id"));
  const members = e.app.findRecordsByFilter(
    lib.collections.users,
    "household = {:home}",
    "displayName",
    100,
    0,
    { home: homeId },
  );
  return e.json(200, {
    members: members.map((member) => ({
      id: member.id,
      displayName: member.getString("displayName"),
      role: member.getString("householdRole"),
    })),
  });
}, $apis.requireAuth("users"));

routerAdd("DELETE", "/api/iceage/homes/{id}/members/{memberId}", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const homeId = lib.requireHomeOwner(e, e.request.pathValue("id"));
  const member = e.app.findRecordById(lib.collections.users, e.request.pathValue("memberId"));
  if (member.getString("household") !== homeId) throw new ForbiddenError();
  if (member.getString("householdRole") === "owner") {
    throw new BadRequestError("Hemmets ägare kan inte tas bort.");
  }
  member.set("household", "");
  member.set("householdRole", "");
  e.app.save(member);
  return e.json(200, { removed: true });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/iceage/homes/{id}/locations", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const homeId = lib.requireHomeOwner(e, e.request.pathValue("id"));
  const body = lib.body(e);
  const existing = e.app.findRecordsByFilter(
    lib.collections.locations,
    "household = {:home}",
    "-position",
    1,
    0,
    { home: homeId },
  );
  const location = new Record(e.app.findCollectionByNameOrId(lib.collections.locations));
  location.set("household", homeId);
  location.set("name", lib.text(body.name, "platsens namn", 80));
  location.set("description", lib.optionalText(body.description, 200));
  location.set("storageType", lib.storageType(body.storageType));
  location.set("position", existing.length ? existing[0].getInt("position") + 1 : 0);
  e.app.save(location);
  return e.json(201, { location: lib.publicRecord(location) });
}, $apis.requireAuth("users"), $apis.bodyLimit(16 * 1024));

routerAdd("PATCH", "/api/iceage/homes/{id}/locations/{locationId}", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const homeId = lib.requireHomeOwner(e, e.request.pathValue("id"));
  const location = lib.location(e.app, e.request.pathValue("locationId"), homeId);
  const body = lib.body(e);
  location.set("name", lib.text(body.name, "platsens namn", 80));
  location.set("description", lib.optionalText(body.description, 200));
  location.set("storageType", lib.storageType(body.storageType));
  e.app.save(location);
  return e.json(200, { location: lib.publicRecord(location) });
}, $apis.requireAuth("users"), $apis.bodyLimit(16 * 1024));

routerAdd("DELETE", "/api/iceage/homes/{id}/locations/{locationId}", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const homeId = lib.requireHomeOwner(e, e.request.pathValue("id"));
  const location = lib.location(e.app, e.request.pathValue("locationId"), homeId);
  const activeLocations = e.app.findRecordsByFilter(
    lib.collections.locations,
    "household = {:home} && archivedAt = ''",
    "",
    2,
    0,
    { home: homeId },
  );
  if (activeLocations.length <= 1) throw new BadRequestError("Hemmet måste ha minst en aktiv förvaringsplats.");
  const activeItems = e.app.findRecordsByFilter(
    lib.collections.items,
    "location = {:location} && status = 'active'",
    "",
    1,
    0,
    { location: location.id },
  );
  if (activeItems.length) throw new BadRequestError("Flytta eller förbruka varorna på platsen först.");
  location.set("archivedAt", new Date().toISOString());
  e.app.save(location);
  return e.json(200, { archived: true });
}, $apis.requireAuth("users"));

function createHomeInvite(e) {
  const lib = require(__hooks + "/lib/iceage.js");
  const homeId = lib.requireHomeOwner(e, e.request.pathValue("id"));

  const token = $security.randomString(32);
  const invitation = new Record(e.app.findCollectionByNameOrId(lib.collections.invitations));
  invitation.set("household", homeId);
  invitation.set("tokenHash", $security.sha256(token));
  invitation.set("invitedBy", e.auth.id);
  invitation.set("expiresAt", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
  e.app.save(invitation);
  return e.json(200, { token: token });
}

routerAdd("POST", "/api/iceage/homes/{id}/invites", createHomeInvite, $apis.requireAuth("users"), $apis.bodyLimit(8 * 1024));
routerAdd("POST", "/api/iceage/households/{id}/invites", createHomeInvite, $apis.requireAuth("users"), $apis.bodyLimit(8 * 1024));

routerAdd("POST", "/api/iceage/invites/accept", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  if (e.auth.getString("household")) throw new BadRequestError("Kontot tillhör redan ett hem.");
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
  const locationId = lib.text(body.locationId, "förvaringsplats", 32);
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
      const locationId = lib.text(body.locationId, "förvaringsplats", 32);
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
  if (String(body.homeId || body.householdId || "") !== householdId) throw new ForbiddenError();

  const photoBase64 = String(body.photoBase64 || "");
  const photoMimeType = String(body.photoMimeType || "image/jpeg");
  if (photoBase64.length > 7_000_000) throw new ApiError(413, "Bilden är för stor.");
  if (photoBase64 && !["image/jpeg", "image/png", "image/webp"].includes(photoMimeType)) {
    throw new BadRequestError("Bildformatet stöds inte.");
  }
  const audioFiles = lib.uploadedFiles(e, "audio");
  if (audioFiles.length > 1) throw new BadRequestError("Skicka högst ett ljudklipp.");
  if (!photoBase64 && audioFiles.length === 0) {
    throw new BadRequestError("Ta en bild eller spela in en beskrivning.");
  }
  lib.consumeExtractionQuota(e.app, e.auth.id);
  const transcript = audioFiles.length === 1 ? lib.transcribe(audioFiles[0]) : "";
  if (!photoBase64 && !transcript) throw new BadRequestError("Ta en bild eller spela in en beskrivning.");

  const locations = e.app.findRecordsByFilter(lib.collections.locations, "household = {:household} && archivedAt = ''", "position", 50, 0, { household: householdId });
  const items = e.app.findRecordsByFilter(lib.collections.items, "household = {:household} && status = 'active'", "-updated", 200, 0, { household: householdId });
  const context = [
    "Datum: " + new Date().toISOString().slice(0, 10) + ".",
    "Förvaringsplatser: " + locations.map((location) => (
      location.getString("name") + " [" + location.getString("storageType") + "]"
    )).join(", ") + ".",
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
