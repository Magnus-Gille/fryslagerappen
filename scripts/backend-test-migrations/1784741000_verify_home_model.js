migrate((app) => {
  const homes = app.findAllRecords("households");
  if (homes.length !== 1) throw new Error("Expected one legacy home.");
  const locations = app.findRecordsByFilter(
    "locations",
    "household = {:home}",
    "position",
    20,
    0,
    { home: homes[0].id },
  );
  const actual = locations.map((location) => ({
    name: location.getString("name"),
    storageType: location.getString("storageType"),
  }));
  const expected = [
    { name: "Frysen på övervåningen", storageType: "freezer" },
    { name: "Frysen i källaren", storageType: "freezer" },
    { name: "Hyllan på övervåningen", storageType: "dry" },
    { name: "Hyllan i ateljén", storageType: "dry" },
    { name: "Kylskåpet på övervåningen", storageType: "fridge" },
  ];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Home model upgrade mismatch: " + JSON.stringify(actual));
  }
});
