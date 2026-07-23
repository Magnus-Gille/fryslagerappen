migrate((app) => {
  const households = app.findCollectionByNameOrId("households");
  const users = app.findCollectionByNameOrId("users");
  const locations = app.findCollectionByNameOrId("locations");
  const items = app.findCollectionByNameOrId("items");
  const events = app.findCollectionByNameOrId("inventory_events");

  for (const field of ["bestBefore", "useBy", "openedOn", "estimatedDate"]) {
    items.fields.add(new TextField({
      name: field,
      max: 10,
      pattern: "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
    }));
  }
  items.fields.add(new TextField({
    name: "barcode",
    max: 14,
    pattern: "^$|^[0-9]{8,14}$",
  }));
  app.save(items);

  for (const item of app.findAllRecords("items")) {
    const legacyDate = item.getString("eatBefore");
    if (!legacyDate) continue;
    if (item.getString("dateSource") === "estimated") {
      item.set("estimatedDate", legacyDate);
    } else {
      item.set("bestBefore", legacyDate);
    }
    app.save(item);
  }

  const productMappings = new Collection({ type: "base", name: "product_mappings" });
  productMappings.fields.add(new AutodateField({ name: "created", onCreate: true, system: true }));
  productMappings.fields.add(new AutodateField({
    name: "updated",
    onCreate: true,
    onUpdate: true,
    system: true,
  }));
  productMappings.fields.add(new RelationField({
    name: "household",
    collectionId: households.id,
    maxSelect: 1,
    required: true,
    cascadeDelete: true,
  }));
  productMappings.fields.add(new TextField({
    name: "barcode",
    required: true,
    min: 8,
    max: 14,
    pattern: "^[0-9]{8,14}$",
  }));
  productMappings.fields.add(new TextField({
    name: "name",
    required: true,
    min: 1,
    max: 120,
    presentable: true,
  }));
  productMappings.fields.add(new TextField({ name: "category", required: true, min: 1, max: 80 }));
  productMappings.fields.add(new TextField({ name: "unit", required: true, min: 1, max: 40 }));
  productMappings.fields.add(new TextField({ name: "imageUrl", max: 500 }));
  productMappings.fields.add(new RelationField({
    name: "confirmedBy",
    collectionId: users.id,
    maxSelect: 1,
    required: true,
  }));
  productMappings.indexes = [
    "CREATE UNIQUE INDEX idx_product_mappings_home_barcode ON product_mappings (household, barcode)",
  ];
  productMappings.listRule = "household = @request.auth.household";
  productMappings.viewRule = "household = @request.auth.household";
  app.save(productMappings);

  const audits = new Collection({ type: "base", name: "inventory_audits" });
  audits.fields.add(new AutodateField({ name: "created", onCreate: true, system: true }));
  audits.fields.add(new AutodateField({
    name: "updated",
    onCreate: true,
    onUpdate: true,
    system: true,
  }));
  audits.fields.add(new RelationField({
    name: "household",
    collectionId: households.id,
    maxSelect: 1,
    required: true,
    cascadeDelete: true,
  }));
  audits.fields.add(new RelationField({
    name: "location",
    collectionId: locations.id,
    maxSelect: 1,
    required: true,
  }));
  audits.fields.add(new RelationField({
    name: "actor",
    collectionId: users.id,
    maxSelect: 1,
    required: true,
  }));
  audits.fields.add(new SelectField({
    name: "status",
    required: true,
    values: ["completed"],
    maxSelect: 1,
  }));
  audits.fields.add(new NumberField({
    name: "changeCount",
    required: true,
    onlyInt: true,
    min: 0,
    max: 1000,
  }));
  audits.fields.add(new TextField({ name: "summary", max: 20000 }));
  audits.indexes = [
    "CREATE INDEX idx_inventory_audits_home_created ON inventory_audits (household, created DESC)",
  ];
  audits.listRule = "household = @request.auth.household";
  audits.viewRule = "household = @request.auth.household";
  app.save(audits);

  events.fields.getByName("eventType").values = [
    "created",
    "quantityChanged",
    "moved",
    "consumed",
    "restored",
    "restocked",
    "audited",
  ];
  events.fields.add(new NumberField({ name: "quantityDelta", min: -100000, max: 100000 }));
  events.fields.add(new NumberField({ name: "quantityBefore", min: 0, max: 100000 }));
  events.fields.add(new NumberField({ name: "quantityAfter", min: 0, max: 100000 }));
  events.fields.add(new TextField({ name: "comment", max: 500 }));
  events.fields.add(new SelectField({
    name: "source",
    values: ["manual", "photo", "voice", "barcode", "audit", "system"],
    maxSelect: 1,
  }));
  events.fields.add(new RelationField({
    name: "fromLocation",
    collectionId: locations.id,
    maxSelect: 1,
  }));
  events.fields.add(new RelationField({
    name: "toLocation",
    collectionId: locations.id,
    maxSelect: 1,
  }));
  events.fields.add(new RelationField({
    name: "audit",
    collectionId: audits.id,
    maxSelect: 1,
  }));
  app.save(events);

  for (const event of app.findAllRecords("inventory_events")) {
    event.set("source", "system");
    const item = app.findRecordById("items", event.getString("item"));
    const quantity = item.getFloat("quantity");
    event.set("quantityAfter", quantity);
    if (event.getString("eventType") === "created") {
      event.set("quantityBefore", 0);
      event.set("quantityDelta", quantity);
      event.set("toLocation", item.getString("location"));
    }
    app.save(event);
  }
}, (app) => {
  const events = app.findCollectionByNameOrId("inventory_events");
  for (const field of [
    "quantityDelta",
    "quantityBefore",
    "quantityAfter",
    "comment",
    "source",
    "fromLocation",
    "toLocation",
    "audit",
  ]) {
    events.fields.removeByName(field);
  }
  events.fields.getByName("eventType").values = [
    "created",
    "quantityChanged",
    "moved",
    "consumed",
    "restored",
  ];
  app.save(events);

  try {
    app.delete(app.findCollectionByNameOrId("inventory_audits"));
  } catch (_) {
    // Allow rollback to be retried after a partial migration.
  }
  try {
    app.delete(app.findCollectionByNameOrId("product_mappings"));
  } catch (_) {
    // Allow rollback to be retried after a partial migration.
  }

  const items = app.findCollectionByNameOrId("items");
  for (const field of [
    "bestBefore",
    "useBy",
    "openedOn",
    "estimatedDate",
    "barcode",
  ]) {
    items.fields.removeByName(field);
  }
  app.save(items);
});
