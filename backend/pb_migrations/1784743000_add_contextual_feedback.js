migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const households = app.findCollectionByNameOrId("households");
  const feedback = new Collection({ type: "base", name: "user_feedback" });

  feedback.fields.add(new AutodateField({ name: "created", onCreate: true, system: true }));
  feedback.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true, system: true }));
  feedback.fields.add(new TextField({ name: "message", required: true, min: 1, max: 1500 }));
  feedback.fields.add(new SelectField({
    name: "kind",
    required: true,
    values: ["problem", "confusing", "idea", "other"],
    maxSelect: 1,
  }));
  feedback.fields.add(new TextField({ name: "route", required: true, min: 1, max: 120 }));
  feedback.fields.add(new TextField({ name: "screen", required: true, min: 1, max: 80 }));
  feedback.fields.add(new TextField({ name: "flow", max: 80 }));
  feedback.fields.add(new TextField({ name: "step", max: 80 }));
  feedback.fields.add(new TextField({ name: "sessionId", max: 64 }));
  feedback.fields.add(new TextField({ name: "appVersion", max: 32 }));
  feedback.fields.add(new TextField({ name: "buildNumber", max: 32 }));
  feedback.fields.add(new TextField({ name: "platform", max: 24 }));
  feedback.fields.add(new TextField({ name: "osVersion", max: 48 }));
  feedback.fields.add(new TextField({ name: "deviceModel", max: 80 }));
  feedback.fields.add(new RelationField({
    name: "user",
    collectionId: users.id,
    maxSelect: 1,
  }));
  feedback.fields.add(new RelationField({
    name: "household",
    collectionId: households.id,
    maxSelect: 1,
  }));
  feedback.indexes = [
    "CREATE INDEX idx_user_feedback_created ON user_feedback (created DESC)",
    "CREATE INDEX idx_user_feedback_context ON user_feedback (screen, flow, step, created DESC)",
  ];
  app.save(feedback);
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("user_feedback"));
  } catch (_) {
    // Allow rollback to be retried after a partial local migration.
  }
});
