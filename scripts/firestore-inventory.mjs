import admin from "firebase-admin";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICE_ACCOUNT_PATH = join(__dirname, "..", "service-account.json");

function loadServiceAccount() {
  try {
    return JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
  } catch {
    console.error("❌ Missing service account credentials.");
    console.error(
      "Place Firebase Admin SDK JSON at project root as 'service-account.json' (do NOT commit it)."
    );
    process.exit(1);
  }
}

function asInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const MAX_DOCS_PER_COLLECTION = asInt(process.env.MAX_DOCS_PER_COLLECTION) ?? 3;

const serviceAccount = loadServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function countCollection(colRef) {
  // Prefer count() aggregation when available
  if (typeof colRef.count === "function") {
    const snap = await colRef.count().get();
    const data = snap.data();
    return typeof data?.count === "number" ? data.count : null;
  }
  // Fallback (may be slow on large collections)
  const snap = await colRef.get();
  return snap.size;
}

async function main() {
  const cols = await db.listCollections();
  if (cols.length === 0) {
    console.log("No top-level collections found.");
    return;
  }

  console.log(`Top-level collections (${cols.length}):`);

  for (const col of cols) {
    const colRef = db.collection(col.id);
    let totalCount = null;
    try {
      totalCount = await countCollection(colRef);
    } catch (e) {
      totalCount = null;
      console.log(`- ${col.id}: (count unavailable: ${e?.message ?? "error"})`);
    }

    if (typeof totalCount === "number") {
      console.log(`- ${col.id}: ${totalCount} docs`);
    } else {
      console.log(`- ${col.id}: (count unknown)`);
    }

    const sampleSnap = await colRef.limit(MAX_DOCS_PER_COLLECTION).get();
    if (sampleSnap.empty) continue;

    for (const doc of sampleSnap.docs) {
      const data = doc.data();
      const keys = data && typeof data === "object" ? Object.keys(data) : [];
      console.log(`  - ${doc.id} (keys: ${keys.slice(0, 25).join(", ")}${keys.length > 25 ? ", ..." : ""})`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Firestore inventory failed:", err?.message ?? err);
    process.exit(1);
  });

