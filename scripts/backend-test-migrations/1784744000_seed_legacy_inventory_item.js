migrate((app) => {
  const home = app.findAllRecords("households")[0];
  const user = app.findAllRecords("users")[0];
  const location = app.findRecordsByFilter(
    "locations",
    "household = {:home}",
    "position",
    1,
    0,
    { home: home.id },
  )[0];
  const item = new Record(app.findCollectionByNameOrId("items"));
  item.set("household", home.id);
  item.set("location", location.id);
  item.set("name", "Legacy tomatsås");
  item.set("category", "Konserver");
  item.set("quantity", 2);
  item.set("unit", "burkar");
  item.set("eatBefore", "2028-01-01");
  item.set("dateSource", "label");
  item.set("status", "active");
  item.set("createdBy", user.id);
  item.set("updatedBy", user.id);
  item.set("version", 1);
  app.save(item);

  const event = new Record(app.findCollectionByNameOrId("inventory_events"));
  event.set("household", home.id);
  event.set("item", item.id);
  event.set("eventType", "created");
  event.set("actor", user.id);
  app.save(event);
});
