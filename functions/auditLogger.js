const admin = require("firebase-admin");

module.exports = async function logAudit({ userId, role, childId, action, entity }) {
  await admin.firestore().collection("auditLogs").add({
    userId,
    role,
    childId,
    action,
    entity,
    source: "mobile",
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
};
