import { z } from "zod";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { eventPropertySchemas, EVENT_VERSIONS } from "../src/lib/tracking/events";
import { consentSnapshotSchema } from "../src/lib/tracking/consent";
import { envelopeMetaSchema, identitySchema } from "../src/lib/tracking/envelope";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "schemas", "event-catalogue.schema.json");

/**
 * Generates the JSON Schema for the full event catalogue (envelope, consent
 * snapshot, identity, and every event's properties) from the TypeScript/zod
 * runtime schemas — the schemas are authoritative and this file is derived,
 * never hand-edited.
 */
function buildCatalogueSchema() {
  const events: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(eventPropertySchemas)) {
    events[name] = {
      event_version: EVENT_VERSIONS[name as keyof typeof EVENT_VERSIONS],
      properties: z.toJSONSchema(schema, { target: "draft-2020-12" }),
    };
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Content Personalization Platform Event Catalogue",
    description:
      "Generated from src/lib/tracking/*.ts. Do not hand-edit; run `npm run schema:generate`.",
    envelope: z.toJSONSchema(envelopeMetaSchema, { target: "draft-2020-12" }),
    identity: z.toJSONSchema(identitySchema, { target: "draft-2020-12" }),
    consent: z.toJSONSchema(consentSnapshotSchema, { target: "draft-2020-12" }),
    events,
  };
}

function main() {
  const mode = process.argv.includes("--check") ? "check" : "write";
  const generated = JSON.stringify(buildCatalogueSchema(), null, 2) + "\n";

  if (mode === "check") {
    if (!existsSync(OUTPUT_PATH)) {
      console.error(
        `Event catalogue schema is missing at ${OUTPUT_PATH}. Run \`npm run schema:generate\`.`,
      );
      process.exit(1);
    }
    const existing = readFileSync(OUTPUT_PATH, "utf8");
    if (existing !== generated) {
      console.error(
        "Event catalogue schema is out of date. Run `npm run schema:generate` and commit the result.",
      );
      process.exit(1);
    }
    console.log("Event catalogue schema is up to date.");
    return;
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, generated);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main();
