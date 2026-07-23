/**
 * A local MongoDB for development, with no install and no cloud account.
 *
 *   npm run db
 *
 * Downloads a real mongod binary on first run (~80 MB, cached in node_modules)
 * and serves it on 127.0.0.1:27017 with the data kept in `.data/mongo`, so
 * everything you do survives a restart. It is the same MongoDB the app would
 * talk to on Atlas — only the address is different.
 *
 * Leave this running in its own terminal, then `npm run seed` and `npm run dev`
 * in another. Switching to Atlas later is one line in `.env.local`.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = 27017;
const DB_PATH = resolve(process.cwd(), ".data/mongo");

// Pop!_OS is Ubuntu underneath, but the binary downloader does not know that.
process.env.MONGOMS_DISTRO ??= "ubuntu-22.04";

async function main() {
  mkdirSync(DB_PATH, { recursive: true });

  console.log("starting mongod (first run downloads the binary — give it a minute)");

  const server = await MongoMemoryServer.create({
    instance: {
      port: PORT,
      dbPath: DB_PATH,
      storageEngine: "wiredTiger",
      // Without this the server wipes dbPath on boot, which would make the
      // whole point of a persistent path moot.
      launchTimeout: 120_000,
    },
  });

  console.log(`\n  mongod ready   ${server.getUri()}`);
  console.log(`  data           ${DB_PATH}`);
  console.log(`  env            MONGODB_URI=mongodb://127.0.0.1:${PORT}/developeros`);
  console.log("\n  leave this running. ctrl-c to stop.\n");

  const shutdown = async () => {
    console.log("\nstopping mongod, keeping the data");
    await server.stop({ doCleanup: false, force: false });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
