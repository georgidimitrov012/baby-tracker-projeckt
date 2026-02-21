const functions = require("firebase-functions");
const admin = require("firebase-admin");
const logAudit = require("./auditLogger");

admin.initializeApp();

exports.onSleepCreated = functions.firestore
  .document("children/{childId}/sleep/{sleepId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    await logAudit({
      userId: data.createdBy,
      role: data.role,
      childId: context.params.childId,
      action: "CREATE_SLEEP",
      entity: "sleep"
    });
  });
