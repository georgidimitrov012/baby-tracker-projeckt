/**
 * Firestore Security Rules Tests
 * ──────────────────────────────────────────────────────────────────────────
 * REQUIRES: Firebase Emulator Suite
 *
 * Before running these tests, start the emulator:
 *   firebase emulators:start --only firestore
 *
 * Or add to package.json scripts:
 *   "test:rules": "firebase emulators:exec --only firestore 'jest __tests__/security'"
 *
 * Install required package:
 *   npm install --save-dev @firebase/rules-unit-testing
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const fs   = require("fs");
const path = require("path");

const PROJECT_ID = "baby-tracker-test";
const RULES_PATH = path.resolve(__dirname, "../../../firestore.rules");

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(RULES_PATH, "utf8"),
      host:  "127.0.0.1",
      port:  8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

afterEach(async () => {
  await testEnv?.clearFirestore();
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function seedBaby(babyId, members) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`babies/${babyId}`).set({ name: "Luna", members });
  });
}

function userDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function anonDb() {
  return testEnv.unauthenticatedContext().firestore();
}

// ── Babies collection ──────────────────────────────────────────────────────

describe("babies — read", () => {
  it("member can read baby doc", async () => {
    await seedBaby("b1", { uid1: "owner" });
    await assertSucceeds(userDb("uid1").doc("babies/b1").get());
  });

  it("non-member cannot read baby doc", async () => {
    await seedBaby("b1", { uid1: "owner" });
    await assertFails(userDb("uid2").doc("babies/b1").get());
  });

  it("unauthenticated user cannot read", async () => {
    await seedBaby("b1", { uid1: "owner" });
    await assertFails(anonDb().doc("babies/b1").get());
  });
});

describe("babies — create", () => {
  it("authenticated user can create baby with themselves as owner", async () => {
    await assertSucceeds(
      userDb("uid1").collection("babies").add({
        name: "New Baby",
        members: { uid1: "owner" },
      })
    );
  });

  it("cannot create baby without owner role for self", async () => {
    await assertFails(
      userDb("uid1").collection("babies").add({
        name: "New Baby",
        members: { uid1: "parent" },
      })
    );
  });

  it("unauthenticated user cannot create baby", async () => {
    await assertFails(
      anonDb().collection("babies").add({ name: "New Baby", members: {} })
    );
  });
});

describe("babies — update", () => {
  it("owner can update baby", async () => {
    await seedBaby("b1", { uid1: "owner" });
    await assertSucceeds(userDb("uid1").doc("babies/b1").update({ name: "Updated" }));
  });

  it("admin can update baby", async () => {
    await seedBaby("b1", { uid1: "owner", uid2: "admin" });
    await assertSucceeds(userDb("uid2").doc("babies/b1").update({ name: "Updated" }));
  });

  it("parent cannot update baby profile", async () => {
    await seedBaby("b1", { uid1: "owner", uid2: "parent" });
    await assertFails(userDb("uid2").doc("babies/b1").update({ name: "Hacked" }));
  });
});

describe("babies — delete", () => {
  it("owner can delete baby", async () => {
    await seedBaby("b1", { uid1: "owner" });
    await assertSucceeds(userDb("uid1").doc("babies/b1").delete());
  });

  it("admin cannot delete baby", async () => {
    await seedBaby("b1", { uid1: "owner", uid2: "admin" });
    await assertFails(userDb("uid2").doc("babies/b1").delete());
  });
});

// ── Events subcollection ───────────────────────────────────────────────────

describe("events — read", () => {
  it("viewer can read events", async () => {
    await seedBaby("b1", { uid1: "owner", uid2: "viewer" });
    await assertSucceeds(userDb("uid2").collection("babies/b1/events").get());
  });

  it("non-member cannot read events", async () => {
    await seedBaby("b1", { uid1: "owner" });
    await assertFails(userDb("uid2").collection("babies/b1/events").get());
  });
});

describe("events — write", () => {
  it("parent can create event", async () => {
    await seedBaby("b1", { uid1: "owner", uid2: "parent" });
    await assertSucceeds(
      userDb("uid2").collection("babies/b1/events").add({ type: "feeding", loggedBy: "uid2" })
    );
  });

  it("viewer cannot create event", async () => {
    await seedBaby("b1", { uid1: "owner", uid2: "viewer" });
    await assertFails(
      userDb("uid2").collection("babies/b1/events").add({ type: "poop", loggedBy: "uid2" })
    );
  });

  it("pediatrician cannot create event", async () => {
    await seedBaby("b1", { uid1: "owner", uid2: "pediatrician" });
    await assertFails(
      userDb("uid2").collection("babies/b1/events").add({ type: "poop", loggedBy: "uid2" })
    );
  });
});

// ── Users collection ───────────────────────────────────────────────────────

describe("users", () => {
  it("any signed-in user can read a user doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("users/uid1").set({ displayName: "Alice" });
    });
    await assertSucceeds(userDb("uid2").doc("users/uid1").get());
  });

  it("user can write their own doc", async () => {
    await assertSucceeds(
      userDb("uid1").doc("users/uid1").set({ expoPushToken: "token123" })
    );
  });

  it("user cannot write another user's doc", async () => {
    await assertFails(
      userDb("uid1").doc("users/uid2").set({ expoPushToken: "hacked" })
    );
  });
});

// ── Invites collection ─────────────────────────────────────────────────────

describe("invites", () => {
  it("sender can read their own invite", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("invites/inv1").set({
        fromUid:  "uid1",
        toEmail:  "bob@example.com",
        status:   "pending",
      });
    });
    await assertSucceeds(userDb("uid1").doc("invites/inv1").get());
  });

  it("unrelated user cannot read invite", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("invites/inv1").set({
        fromUid: "uid1",
        toEmail: "bob@example.com",
        status:  "pending",
      });
    });
    await assertFails(userDb("uid3").doc("invites/inv1").get());
  });

  it("sender can delete their invite", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("invites/inv1").set({ fromUid: "uid1", toEmail: "bob@example.com", status: "pending" });
    });
    await assertSucceeds(userDb("uid1").doc("invites/inv1").delete());
  });

  it("non-sender cannot delete invite", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("invites/inv1").set({ fromUid: "uid1", toEmail: "bob@example.com", status: "pending" });
    });
    await assertFails(userDb("uid2").doc("invites/inv1").delete());
  });
});
