migrate((app) => {
  const locationCollection = app.findCollectionByNameOrId("locations");
  const defaults = [
    { name: "Frysen på övervåningen", description: "Övervåningen", position: 0 },
    { name: "Frysen i källaren", description: "Källaren", position: 1 },
    { name: "Hyllan på övervåningen", description: "Torrvaror på övervåningen", position: 2 },
    { name: "Hyllan i ateljén", description: "Torrvaror i ateljén", position: 3 },
  ];
  const renamedDefaults = {
    "Frysen uppe": "Frysen på övervåningen",
    "Frysboxen nere": "Frysen i källaren",
  };

  for (const household of app.findAllRecords("households")) {
    const locations = app.findRecordsByFilter(
      "locations",
      "household = {:household}",
      "position",
      200,
      0,
      { household: household.id },
    );

    for (const oldName of Object.keys(renamedDefaults)) {
      const newName = renamedDefaults[oldName];
      const oldLocation = locations.find((location) => location.getString("name") === oldName);
      const newLocation = locations.find((location) => location.getString("name") === newName);
      if (oldLocation && !newLocation) {
        oldLocation.set("name", newName);
        app.save(oldLocation);
      }
    }

    const currentNames = new Set(
      app.findRecordsByFilter(
        "locations",
        "household = {:household}",
        "",
        200,
        0,
        { household: household.id },
      ).map((location) => location.getString("name")),
    );
    for (const locationData of defaults) {
      if (currentNames.has(locationData.name)) continue;
      const location = new Record(locationCollection);
      location.set("household", household.id);
      location.set("name", locationData.name);
      location.set("description", locationData.description);
      location.set("position", locationData.position);
      app.save(location);
    }
  }
}, () => {
  // Deliberately irreversible: a newly added location may already contain user
  // inventory, so rolling back must never delete or orphan household data.
});
