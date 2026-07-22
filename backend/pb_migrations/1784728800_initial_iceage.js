migrate((app) => {
  function addTimestamps(collection) {
    collection.fields.add(new AutodateField({ name: "created", onCreate: true, system: true }));
    collection.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true, system: true }));
  }

  const households = new Collection({ type: "base", name: "households" });
  addTimestamps(households);
  households.fields.add(new TextField({ name: "name", required: true, min: 1, max: 80, presentable: true }));
  households.listRule = "id = @request.auth.household";
  households.viewRule = "id = @request.auth.household";
  app.save(households);

  const users = app.findCollectionByNameOrId("users");
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.createRule = null;
  users.updateRule = null;
  users.deleteRule = null;
  users.fields.add(new TextField({ name: "displayName", min: 1, max: 80, presentable: true }));
  users.fields.add(new RelationField({ name: "household", collectionId: households.id, maxSelect: 1 }));
  users.fields.add(new SelectField({ name: "householdRole", values: ["owner", "member"], maxSelect: 1 }));
  users.passwordAuth.enabled = true;
  users.passwordAuth.identityFields = ["email"];
  app.save(users);

  households.fields.add(new RelationField({
    name: "owner",
    collectionId: users.id,
    maxSelect: 1,
    required: true,
    cascadeDelete: true,
  }));
  app.save(households);

  const locations = new Collection({ type: "base", name: "locations" });
  addTimestamps(locations);
  locations.fields.add(new RelationField({ name: "household", collectionId: households.id, maxSelect: 1, required: true, cascadeDelete: true }));
  locations.fields.add(new TextField({ name: "name", required: true, min: 1, max: 80, presentable: true }));
  locations.fields.add(new TextField({ name: "description", max: 200 }));
  locations.fields.add(new NumberField({ name: "position", onlyInt: true, min: 0, max: 1000 }));
  locations.fields.add(new DateField({ name: "archivedAt" }));
  locations.indexes = [
    "CREATE UNIQUE INDEX idx_locations_household_name ON locations (household, name)",
    "CREATE INDEX idx_locations_household_position ON locations (household, position)",
  ];
  locations.listRule = "household = @request.auth.household";
  locations.viewRule = "household = @request.auth.household";
  app.save(locations);

  const items = new Collection({ type: "base", name: "items" });
  addTimestamps(items);
  items.fields.add(new RelationField({ name: "household", collectionId: households.id, maxSelect: 1, required: true, cascadeDelete: true }));
  items.fields.add(new RelationField({ name: "location", collectionId: locations.id, maxSelect: 1, required: true }));
  items.fields.add(new TextField({ name: "name", required: true, min: 1, max: 120, presentable: true }));
  items.fields.add(new TextField({ name: "category", required: true, min: 1, max: 80 }));
  items.fields.add(new NumberField({ name: "quantity", required: true, min: 0, max: 100000 }));
  items.fields.add(new TextField({ name: "unit", required: true, min: 1, max: 40 }));
  items.fields.add(new TextField({ name: "frozenOn", max: 10, pattern: "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" }));
  items.fields.add(new TextField({ name: "eatBefore", max: 10, pattern: "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$" }));
  items.fields.add(new SelectField({ name: "dateSource", required: true, values: ["manual", "label", "estimated", "none"], maxSelect: 1 }));
  items.fields.add(new TextField({ name: "note", max: 500 }));
  items.fields.add(new SelectField({ name: "status", required: true, values: ["active", "consumed", "discarded"], maxSelect: 1 }));
  items.fields.add(new RelationField({ name: "createdBy", collectionId: users.id, maxSelect: 1, required: true }));
  items.fields.add(new RelationField({ name: "updatedBy", collectionId: users.id, maxSelect: 1, required: true }));
  items.fields.add(new NumberField({ name: "version", required: true, onlyInt: true, min: 1 }));
  items.indexes = [
    "CREATE INDEX idx_items_household_status ON items (household, status, updated DESC)",
    "CREATE INDEX idx_items_household_name ON items (household, name COLLATE NOCASE)",
  ];
  items.listRule = "household = @request.auth.household";
  items.viewRule = "household = @request.auth.household";
  app.save(items);

  const events = new Collection({ type: "base", name: "inventory_events" });
  addTimestamps(events);
  events.fields.add(new RelationField({ name: "household", collectionId: households.id, maxSelect: 1, required: true, cascadeDelete: true }));
  events.fields.add(new RelationField({ name: "item", collectionId: items.id, maxSelect: 1, required: true, cascadeDelete: true }));
  events.fields.add(new SelectField({ name: "eventType", required: true, values: ["created", "quantityChanged", "moved", "consumed", "restored"], maxSelect: 1 }));
  events.fields.add(new RelationField({ name: "actor", collectionId: users.id, maxSelect: 1, required: true }));
  events.indexes = ["CREATE INDEX idx_inventory_events_household_created ON inventory_events (household, created DESC)"];
  events.listRule = "household = @request.auth.household";
  events.viewRule = "household = @request.auth.household";
  app.save(events);

  const invitations = new Collection({ type: "base", name: "household_invitations" });
  addTimestamps(invitations);
  invitations.fields.add(new RelationField({ name: "household", collectionId: households.id, maxSelect: 1, required: true, cascadeDelete: true }));
  invitations.fields.add(new TextField({ name: "tokenHash", required: true, min: 64, max: 64, hidden: true }));
  invitations.fields.add(new RelationField({ name: "invitedBy", collectionId: users.id, maxSelect: 1, required: true }));
  invitations.fields.add(new DateField({ name: "expiresAt", required: true }));
  invitations.fields.add(new DateField({ name: "acceptedAt" }));
  invitations.fields.add(new RelationField({ name: "acceptedBy", collectionId: users.id, maxSelect: 1 }));
  invitations.indexes = ["CREATE UNIQUE INDEX idx_household_invitations_token ON household_invitations (tokenHash)"];
  app.save(invitations);

  const quotas = new Collection({ type: "base", name: "extraction_quotas" });
  addTimestamps(quotas);
  quotas.fields.add(new RelationField({ name: "user", collectionId: users.id, maxSelect: 1, required: true, cascadeDelete: true }));
  quotas.fields.add(new DateField({ name: "windowStartedAt", required: true }));
  quotas.fields.add(new NumberField({ name: "requestCount", required: true, onlyInt: true, min: 0 }));
  quotas.indexes = ["CREATE UNIQUE INDEX idx_extraction_quotas_user ON extraction_quotas (user)"];
  app.save(quotas);
}, (app) => {
  for (const name of [
    "extraction_quotas",
    "household_invitations",
    "inventory_events",
    "items",
    "locations",
    "households",
  ]) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (_) {
      // Allow rollback to be retried after a partial local migration.
    }
  }
  try {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("displayName");
    users.fields.removeByName("household");
    users.fields.removeByName("householdRole");
    users.listRule = null;
    users.viewRule = null;
    users.createRule = null;
    users.updateRule = null;
    users.deleteRule = null;
    app.save(users);
  } catch (_) {
    // Allow rollback to be retried after a partial local migration.
  }
});
