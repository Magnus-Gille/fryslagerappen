migrate((app) => {
  const item = app.findFirstRecordByData("items", "name", "Legacy tomatsås");
  if (item.getString("bestBefore") !== "2028-01-01") {
    throw new Error("Legacy best-before date was not migrated.");
  }
  if (item.getString("estimatedDate") !== "") {
    throw new Error("Confirmed legacy date was incorrectly marked estimated.");
  }
  const event = app.findFirstRecordByData("inventory_events", "item", item.id);
  if (event.getString("source") !== "system") {
    throw new Error("Legacy event source was not backfilled.");
  }
  app.findCollectionByNameOrId("product_mappings");
  app.findCollectionByNameOrId("inventory_audits");
});
