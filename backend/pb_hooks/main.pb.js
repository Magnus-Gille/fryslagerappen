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

routerAdd("POST", "/api/iceage/telemetry", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  lib.consumeTelemetryQuota(e);
  const diagnostic = lib.telemetry(e.requestInfo().body || {});

  $app.logger().info("client.telemetry",
    "event", diagnostic.event,
    "sessionId", diagnostic.sessionId,
    "sequence", diagnostic.sequence,
    "appVersion", diagnostic.appVersion,
    "buildNumber", diagnostic.buildNumber,
    "platform", diagnostic.platform,
    "osVersion", diagnostic.osVersion,
    "deviceModel", diagnostic.deviceModel,
    "stage", diagnostic.stage,
    "status", diagnostic.status,
    "errorCode", diagnostic.errorCode,
    "errorMessage", diagnostic.errorMessage,
    "durationMs", diagnostic.durationMs,
    "serverDurationMs", diagnostic.serverDurationMs,
    "transcriptionMs", diagnostic.transcriptionMs,
    "inferenceMs", diagnostic.inferenceMs,
    "reachable", diagnostic.reachable,
  );
  return e.json(202, { accepted: true });
}, $apis.bodyLimit(8 * 1024));

routerAdd("POST", "/api/iceage/feedback", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  lib.consumeFeedbackQuota(e);
  const input = lib.feedback(e.requestInfo().body || {});
  const feedback = new Record(e.app.findCollectionByNameOrId(lib.collections.feedback));

  feedback.set("message", input.message);
  feedback.set("kind", input.kind);
  feedback.set("route", input.route);
  feedback.set("screen", input.screen);
  feedback.set("flow", input.flow);
  feedback.set("step", input.step);
  feedback.set("sessionId", input.sessionId);
  feedback.set("appVersion", input.appVersion);
  feedback.set("buildNumber", input.buildNumber);
  feedback.set("platform", input.platform);
  feedback.set("osVersion", input.osVersion);
  feedback.set("deviceModel", input.deviceModel);
  if (e.auth && e.auth.id) {
    feedback.set("user", e.auth.id);
    feedback.set("household", e.auth.getString("household"));
  }
  e.app.save(feedback);

  $app.logger().info("client.feedback",
    "feedbackId", feedback.id,
    "kind", input.kind,
    "route", input.route,
    "screen", input.screen,
    "flow", input.flow,
    "step", input.step,
    "sessionId", input.sessionId,
    "appVersion", input.appVersion,
    "buildNumber", input.buildNumber,
    "platform", input.platform,
    "deviceModel", input.deviceModel,
    "authenticated", Boolean(e.auth && e.auth.id),
  );
  return e.json(202, { accepted: true, id: feedback.id });
}, $apis.bodyLimit(8 * 1024));

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

routerAdd("GET", "/api/iceage/barcodes/{barcode}", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const householdId = lib.household(e);
  const barcode = lib.barcode(e.request.pathValue("barcode"));
  let mapping = null;
  try {
    mapping = e.app.findFirstRecordByFilter(
      lib.collections.productMappings,
      "household = {:household} && barcode = {:barcode}",
      { household: householdId, barcode: barcode },
    );
  } catch (_) {
    // A miss falls through to the public product catalogue.
  }
  if (mapping) {
    return e.json(200, {
      source: "home",
      product: {
        barcode: mapping.getString("barcode"),
        name: mapping.getString("name"),
        category: mapping.getString("category"),
        unit: mapping.getString("unit"),
        imageUrl: mapping.getString("imageUrl") || undefined,
      },
    });
  }
  return e.json(200, {
    source: "open_food_facts",
    product: lib.lookupProduct(barcode),
  });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/iceage/barcodes/{barcode}/confirm", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const householdId = lib.household(e);
  const body = lib.body(e);
  const mapping = lib.upsertProductMapping(e.app, householdId, e.auth.id, {
    barcode: lib.barcode(e.request.pathValue("barcode")),
    name: body.name,
    category: body.category,
    unit: body.unit,
    imageUrl: body.imageUrl,
  });
  return e.json(200, {
    product: {
      barcode: mapping.getString("barcode"),
      name: mapping.getString("name"),
      category: mapping.getString("category"),
      unit: mapping.getString("unit"),
      imageUrl: mapping.getString("imageUrl") || undefined,
    },
  });
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
  const barcode = lib.barcode(body.barcode);
  const source = lib.changeSource(body.changeSource, "manual");
  if (source === "barcode" && !barcode) throw new BadRequestError("Streckkoden saknas.");
  const bestBefore = lib.date(body.bestBefore);
  const useBy = lib.date(body.useBy);
  const openedOn = lib.date(body.openedOn);
  const estimatedDate = lib.date(body.estimatedDate);
  const legacyDate = lib.date(
    body.eatBefore || useBy || bestBefore || estimatedDate,
  );

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
    item.set("eatBefore", legacyDate);
    item.set("bestBefore", bestBefore);
    item.set("useBy", useBy);
    item.set("openedOn", openedOn);
    item.set("estimatedDate", estimatedDate);
    item.set("dateSource", dateSource);
    item.set("barcode", barcode);
    item.set("note", lib.optionalText(body.note, 500));
    item.set("status", "active");
    item.set("createdBy", e.auth.id);
    item.set("updatedBy", e.auth.id);
    item.set("version", 1);
    txApp.save(item);
    if (barcode) {
      lib.upsertProductMapping(txApp, householdId, e.auth.id, {
        barcode: barcode,
        name: item.getString("name"),
        category: item.getString("category"),
        unit: item.getString("unit"),
        imageUrl: body.imageUrl,
      });
    }
    lib.event(txApp, householdId, item.id, "created", e.auth.id, {
      quantityBefore: 0,
      quantityAfter: item.getFloat("quantity"),
      quantityDelta: item.getFloat("quantity"),
      comment: body.comment || (source === "voice" ? body.note : ""),
      source: source,
      toLocation: locationId,
    });
    itemResult = lib.publicRecord(item);
  });
  return e.json(201, { item: itemResult });
}, $apis.requireAuth("users"), $apis.bodyLimit(64 * 1024));

routerAdd("POST", "/api/iceage/items/{id}/mutate", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const householdId = lib.household(e);
  const body = lib.body(e);
  const action = String(body.action || "");
  const source = lib.changeSource(body.changeSource, "manual");
  const comment = lib.optionalText(body.comment, 500);
  const expectedVersion = lib.number(body.expectedVersion, "version", 1, 1000000000);
  let itemResult = null;

  e.app.runInTransaction((txApp) => {
    const item = txApp.findRecordById(lib.collections.items, e.request.pathValue("id"));
    if (item.getString("household") !== householdId) throw new ForbiddenError();
    if (item.getInt("version") !== expectedVersion) {
      throw new ApiError(409, "Lagret ändrades på en annan enhet. Försök igen.");
    }

    const quantityBefore = item.getFloat("quantity");
    const locationBefore = item.getString("location");
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
    const quantityAfter = item.getFloat("quantity");
    lib.event(txApp, householdId, item.id, eventType, e.auth.id, {
      quantityBefore: quantityBefore,
      quantityAfter: quantityAfter,
      quantityDelta: quantityAfter - quantityBefore,
      comment: comment,
      source: source,
      fromLocation: locationBefore,
      toLocation: item.getString("location"),
    });
    itemResult = lib.publicRecord(item);
  });
  return e.json(200, { item: itemResult });
}, $apis.requireAuth("users"), $apis.bodyLimit(16 * 1024));

routerAdd("POST", "/api/iceage/locations/{id}/audits", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const householdId = lib.household(e);
  const locationId = lib.text(e.request.pathValue("id"), "förvaringsplats", 32);
  lib.location(e.app, locationId, householdId);
  const body = lib.body(e);
  if (!Array.isArray(body.rows) || !Array.isArray(body.extras)) {
    throw new BadRequestError("Inventeringen saknar rader.");
  }
  if (body.rows.length > 500 || body.extras.length > 100) {
    throw new BadRequestError("Inventeringen är för stor.");
  }

  let auditResult = null;
  e.app.runInTransaction((txApp) => {
    const rows = [];
    const seen = {};
    for (const input of body.rows) {
      const itemId = lib.text(input.itemId, "vara", 32);
      if (seen[itemId]) throw new BadRequestError("Samma vara finns flera gånger.");
      seen[itemId] = true;
      const item = txApp.findRecordById(lib.collections.items, itemId);
      if (
        item.getString("household") !== householdId ||
        item.getString("location") !== locationId ||
        item.getString("status") !== "active"
      ) {
        throw new BadRequestError("Varan hör inte till den inventerade platsen.");
      }
      const expectedVersion = lib.number(input.expectedVersion, "version", 1, 1000000000);
      if (item.getInt("version") !== expectedVersion) {
        throw new ApiError(409, "Lagret ändrades på en annan enhet. Starta om inventeringen.");
      }
      rows.push({
        item: item,
        expectedVersion: expectedVersion,
        observedQuantity: lib.number(input.observedQuantity, "observerad mängd", 0, 100000),
        note: lib.optionalText(input.note, 500),
      });
    }

    const extras = body.extras.map((input) => ({
      name: lib.text(input.name, "namn", 120),
      category: lib.text(input.category, "kategori", 80),
      quantity: lib.number(input.quantity, "antal", 0.01, 100000),
      unit: lib.text(input.unit, "enhet", 40),
      note: lib.optionalText(input.note, 500),
    }));
    const changedRows = rows.filter(
      (row) => row.item.getFloat("quantity") !== row.observedQuantity,
    );
    const audit = new Record(txApp.findCollectionByNameOrId(lib.collections.audits));
    audit.set("household", householdId);
    audit.set("location", locationId);
    audit.set("actor", e.auth.id);
    audit.set("status", "completed");
    audit.set("changeCount", changedRows.length + extras.length);
    audit.set("summary", JSON.stringify({
      adjusted: changedRows.length,
      added: extras.length,
    }));
    txApp.save(audit);

    for (const row of changedRows) {
      const quantityBefore = row.item.getFloat("quantity");
      row.item.set("quantity", row.observedQuantity);
      row.item.set("status", row.observedQuantity === 0 ? "consumed" : "active");
      row.item.set("updatedBy", e.auth.id);
      row.item.set("version", row.expectedVersion + 1);
      txApp.save(row.item);
      lib.event(
        txApp,
        householdId,
        row.item.id,
        row.observedQuantity === 0
          ? "consumed"
          : row.observedQuantity > quantityBefore
            ? "restocked"
            : "quantityChanged",
        e.auth.id,
        {
          quantityBefore: quantityBefore,
          quantityAfter: row.observedQuantity,
          quantityDelta: row.observedQuantity - quantityBefore,
          comment: row.note,
          source: "audit",
          fromLocation: locationId,
          toLocation: locationId,
          audit: audit.id,
        },
      );
    }

    for (const extra of extras) {
      const item = new Record(txApp.findCollectionByNameOrId(lib.collections.items));
      item.set("household", householdId);
      item.set("location", locationId);
      item.set("name", extra.name);
      item.set("category", extra.category);
      item.set("quantity", extra.quantity);
      item.set("unit", extra.unit);
      item.set("dateSource", "none");
      item.set("note", extra.note);
      item.set("status", "active");
      item.set("createdBy", e.auth.id);
      item.set("updatedBy", e.auth.id);
      item.set("version", 1);
      txApp.save(item);
      lib.event(txApp, householdId, item.id, "created", e.auth.id, {
        quantityBefore: 0,
        quantityAfter: extra.quantity,
        quantityDelta: extra.quantity,
        comment: extra.note,
        source: "audit",
        toLocation: locationId,
        audit: audit.id,
      });
    }
    auditResult = lib.publicRecord(audit);
  });

  return e.json(201, { audit: auditResult });
}, $apis.requireAuth("users"), $apis.bodyLimit(256 * 1024));

routerAdd("POST", "/api/iceage/extract", (e) => {
  const lib = require(__hooks + "/lib/iceage.js");
  const startedAt = Date.now();
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
  const transcriptionStartedAt = Date.now();
  const transcript = audioFiles.length === 1 ? lib.transcribe(audioFiles[0]) : "";
  const transcriptionMs = Date.now() - transcriptionStartedAt;
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
    "Skilj på bestBefore (bäst före), useBy (sista förbrukningsdag), openedOn (öppnad) och estimatedDate (uppskattat planeringsdatum).",
    "Gissa aldrig ett tryckt datum. Uppskattade datum ska bara ligga i estimatedDate och markeras estimated.",
    "Markera varje osäkert fält. Svara på svenska.",
  ].join("\n");
  const inferenceStartedAt = Date.now();
  const intent = lib.extractIntent(context, photoBase64, photoMimeType);
  const inferenceMs = Date.now() - inferenceStartedAt;
  intent.transcript = transcript || null;
  return e.json(200, {
    intent: intent,
    timing: {
      transcriptionMs: transcriptionMs,
      inferenceMs: inferenceMs,
      totalMs: Date.now() - startedAt,
    },
  });
}, $apis.requireAuth("users"), $apis.bodyLimit(20 * 1024 * 1024));
