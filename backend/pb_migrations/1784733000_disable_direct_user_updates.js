migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.updateRule = null;
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.updateRule = "id = @request.auth.id && household = @request.auth.household && householdRole = @request.auth.householdRole";
  app.save(users);
});
