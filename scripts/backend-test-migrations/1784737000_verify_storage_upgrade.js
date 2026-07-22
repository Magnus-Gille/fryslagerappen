migrate((app) => {
  const households = app.findAllRecords("households");
  if (households.length !== 1) throw new Error("Expected one legacy household.");
  const locations = app.findRecordsByFilter(
    "locations",
    "household = {:household}",
    "position",
    20,
    0,
    { household: households[0].id },
  );
  const actual = locations.map((location) => location.getString("name"));
  const expected = [
    "Frysen på övervåningen",
    "Frysen i källaren",
    "Hyllan på övervåningen",
    "Hyllan i ateljén",
  ];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Storage upgrade mismatch: " + JSON.stringify(actual));
  }
});
