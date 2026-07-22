migrate((app) => {
  const user = new Record(app.findCollectionByNameOrId("users"));
  user.setEmail("legacy@example.invalid");
  user.setPassword($security.randomString(32) + "Aa1!");
  user.set("displayName", "Legacy test user");
  app.save(user);

  const household = new Record(app.findCollectionByNameOrId("households"));
  household.set("name", "Legacy test household");
  household.set("owner", user.id);
  app.save(household);

  user.set("household", household.id);
  user.set("householdRole", "owner");
  app.save(user);

  const locations = app.findCollectionByNameOrId("locations");
  for (const locationData of [
    { name: "Frysen uppe", description: "Köket", position: 0 },
    { name: "Frysboxen nere", description: "Källaren", position: 1 },
  ]) {
    const location = new Record(locations);
    location.set("household", household.id);
    location.set("name", locationData.name);
    location.set("description", locationData.description);
    location.set("position", locationData.position);
    app.save(location);
  }
});
