migrate((app) => {
  const locationsCollection = app.findCollectionByNameOrId("locations");
  locationsCollection.fields.add(new SelectField({
    name: "storageType",
    values: ["freezer", "fridge", "dry"],
    maxSelect: 1,
  }));
  app.save(locationsCollection);

  const typeByName = {
    "Frysen på övervåningen": "freezer",
    "Frysen i källaren": "freezer",
    "Hyllan på övervåningen": "dry",
    "Hyllan i ateljén": "dry",
  };
  for (const location of app.findAllRecords("locations")) {
    const inferredType = typeByName[location.getString("name")] || "dry";
    location.set("storageType", inferredType);
    app.save(location);
  }

  for (const home of app.findAllRecords("households")) {
    const existingFridges = app.findRecordsByFilter(
      "locations",
      "household = {:home} && storageType = 'fridge' && archivedAt = ''",
      "",
      1,
      0,
      { home: home.id },
    );
    if (existingFridges.length > 0) continue;
    const existingLocations = app.findRecordsByFilter(
      "locations",
      "household = {:home}",
      "-position",
      1,
      0,
      { home: home.id },
    );
    const fridge = new Record(locationsCollection);
    fridge.set("household", home.id);
    fridge.set("name", "Kylskåpet på övervåningen");
    fridge.set("description", "Kylda varor på övervåningen");
    fridge.set("storageType", "fridge");
    fridge.set("position", existingLocations.length ? existingLocations[0].getInt("position") + 1 : 0);
    app.save(fridge);
  }

  locationsCollection.fields.getByName("storageType").required = true;
  app.save(locationsCollection);
}, (app) => {
  const locations = app.findCollectionByNameOrId("locations");
  locations.fields.removeByName("storageType");
  app.save(locations);
});
