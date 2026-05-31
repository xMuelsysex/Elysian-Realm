import test from "node:test";
import assert from "node:assert/strict";

import { pilotPersonaIds, pilotPersonas, validatePersonaRoster, validatePersonaSpec, parsePersonaSpec, PersonaValidationError } from "../src/server/personas/index.js";

test("accepts the three pilot persona fixtures", () => {
  const result = validatePersonaRoster(pilotPersonas);

  assert.deepEqual(result, { ok: true, errors: [] });
  assert.equal(pilotPersonas.length, 3);
});

test("parsePersonaSpec returns a valid typed fixture", () => {
  const persona = parsePersonaSpec(pilotPersonas[0], { knownPersonaIds: pilotPersonaIds });

  assert.equal(persona.id, "elysia");
  assert.equal(persona.authorship, "placeholder");
});

test("rejects missing required identity field", () => {
  const invalid = { ...pilotPersonas[0] };
  delete (invalid as Record<string, unknown>).displayName;

  const result = validatePersonaSpec(invalid, { knownPersonaIds: pilotPersonaIds });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /persona\.displayName must be a non-empty string/);
});

test("rejects missing required speech style field", () => {
  const invalid = {
    ...pilotPersonas[0],
    speech: { ...pilotPersonas[0].speech, tone: "" },
  };

  const result = validatePersonaSpec(invalid, { knownPersonaIds: pilotPersonaIds });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /speech\.tone must be a non-empty string/);
});

test("rejects missing required routine field", () => {
  const invalid = {
    ...pilotPersonas[0],
    routines: { ...pilotPersonas[0].routines, morning: [] },
  };

  const result = validatePersonaSpec(invalid, { knownPersonaIds: pilotPersonaIds });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /routines\.morning must be a non-empty array/);
});

test("rejects missing required relationship fields", () => {
  const invalid = {
    ...pilotPersonas[0],
    relationships: [{ ...pilotPersonas[0].relationships[0], notes: "" }],
  };

  const result = validatePersonaSpec(invalid, { knownPersonaIds: pilotPersonaIds });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /relationships\[0\]\.notes must be a non-empty string/);
});

test("rejects generated or runtime memory-like fields in persona fixtures", () => {
  const invalid = {
    ...pilotPersonas[0],
    generatedMemories: ["This belongs in memory storage, not persona config."],
    currentPlan: { id: "plan-1" },
  };

  const result = validatePersonaSpec(invalid, { knownPersonaIds: pilotPersonaIds });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /persona\.generatedMemories is generated\/runtime state/);
  assert.match(result.errors.join("\n"), /persona\.currentPlan is generated\/runtime state/);
});

test("rejects nested generated or runtime fields in persona fixtures", () => {
  const invalid = {
    ...pilotPersonas[0],
    profile: {
      ...pilotPersonas[0].profile,
      generatedReflections: ["Generated insights belong in memory storage."],
    },
    relationships: [
      {
        ...pilotPersonas[0].relationships[0],
        runtimeState: { lastConversationAt: "2026-05-31T01:00:00.000Z" },
      },
    ],
  };

  const result = validatePersonaSpec(invalid, { knownPersonaIds: pilotPersonaIds });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /persona\.profile\.generatedReflections is generated\/runtime state/);
  assert.match(result.errors.join("\n"), /persona\.relationships\[0\]\.runtimeState is generated\/runtime state/);
});

test("rejects relationships that point outside supplied pilot persona ids", () => {
  const invalid = {
    ...pilotPersonas[0],
    relationships: [{ ...pilotPersonas[0].relationships[0], targetPersonaId: "unknown-agent" }],
  };

  const result = validatePersonaSpec(invalid, { knownPersonaIds: pilotPersonaIds });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /targetPersonaId must reference a known persona id/);
});

test("rejects missing content boundary fields", () => {
  const invalid = {
    ...pilotPersonas[0],
    contentBoundaries: { ...pilotPersonas[0].contentBoundaries, legal: [] },
  };

  const result = validatePersonaSpec(invalid, { knownPersonaIds: pilotPersonaIds });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /contentBoundaries\.legal must be a non-empty string array/);
});

test("rejects duplicate persona ids in a roster", () => {
  const result = validatePersonaRoster([pilotPersonas[0], { ...pilotPersonas[1], id: pilotPersonas[0].id }]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /duplicate persona id: elysia/);
});

test("parsePersonaSpec throws a diagnostic error for invalid input", () => {
  assert.throws(
    () => parsePersonaSpec({ id: "empty" }, { knownPersonaIds: pilotPersonaIds }),
    (error) => error instanceof PersonaValidationError && error.errors.length > 0,
  );
});
