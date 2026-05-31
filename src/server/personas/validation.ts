import { PERSONA_SCHEMA_VERSION, type PersonaRelationshipSeed, type PersonaRoutineActivity, type PersonaSpec } from "../../shared/contracts/index.js";
import type { PersonaId } from "../../shared/domain/index.js";

export interface PersonaValidationContext {
  knownPersonaIds?: readonly PersonaId[];
}

export interface PersonaValidationResult {
  ok: boolean;
  errors: string[];
}

const FORBIDDEN_PERSONA_FIELDS = new Set([
  "memories",
  "memoryStream",
  "generatedMemories",
  "reflections",
  "generatedReflections",
  "runtimeState",
  "currentPlan",
  "currentAction",
  "inProgressOperationId",
]);

export function validatePersonaSpec(input: unknown, context: PersonaValidationContext = {}): PersonaValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["persona must be an object"] };
  }

  rejectForbiddenFields(input, "persona", errors);
  requireString(input, "schemaVersion", errors);
  if (input.schemaVersion !== PERSONA_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PERSONA_SCHEMA_VERSION}`);
  }

  requireString(input, "id", errors);
  requireString(input, "displayName", errors);
  requireStringArray(input, "aliases", errors);
  requireOneOf(input, "authorship", ["user-authored", "placeholder", "licensed", "generated-draft"], errors);
  requireString(input, "sourceNotes", errors);
  requireString(input, "updatedAt", errors);

  validateProfile(input.profile, errors);
  validateSpeech(input.speech, errors);
  validatePersonality(input.personality, errors);
  validateRoutines(input.routines, errors);
  validatePreferences(input.preferences, errors);
  validateRelationships(input.relationships, context.knownPersonaIds, errors);
  validateContentBoundaries(input.contentBoundaries, errors);

  return { ok: errors.length === 0, errors };
}

export function parsePersonaSpec(input: unknown, context: PersonaValidationContext = {}): PersonaSpec {
  const result = validatePersonaSpec(input, context);
  if (!result.ok) {
    throw new PersonaValidationError(result.errors);
  }
  return input as PersonaSpec;
}

export function validatePersonaRoster(personas: readonly unknown[]): PersonaValidationResult {
  const ids = personas.filter(isRecord).map((persona) => persona.id).filter((id): id is string => typeof id === "string");
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      errors.push(`duplicate persona id: ${id}`);
    }
    seen.add(id);
  }

  personas.forEach((persona, index) => {
    const result = validatePersonaSpec(persona, { knownPersonaIds: ids });
    for (const error of result.errors) {
      errors.push(`personas[${index}]: ${error}`);
    }
  });

  return { ok: errors.length === 0, errors };
}

export class PersonaValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Invalid persona spec: ${errors.join("; ")}`);
    this.name = "PersonaValidationError";
  }
}

function validateProfile(value: unknown, errors: string[]): void {
  if (!requireRecord(value, "profile", errors)) return;
  requireString(value, "archetype", errors, "profile");
  requireStringArray(value, "values", errors, "profile");
  requireStringArray(value, "longTermGoals", errors, "profile");
  requireStringArray(value, "constraints", errors, "profile");
}

function validateSpeech(value: unknown, errors: string[]): void {
  if (!requireRecord(value, "speech", errors)) return;
  requireString(value, "tone", errors, "speech");
  requireString(value, "cadence", errors, "speech");
  requireStringArray(value, "preferredAddressForms", errors, "speech");
  requireStringArray(value, "tabooTopics", errors, "speech");
  requireStringArray(value, "tabooPhrases", errors, "speech");
}

function validatePersonality(value: unknown, errors: string[]): void {
  if (!requireRecord(value, "personality", errors)) return;
  requireStringArray(value, "traits", errors, "personality");
  requireStringArray(value, "strengths", errors, "personality");
  requireStringArray(value, "flaws", errors, "personality");
  requireStringArray(value, "emotionalTriggers", errors, "personality");
}

function validateRoutines(value: unknown, errors: string[]): void {
  if (!requireRecord(value, "routines", errors)) return;
  for (const field of ["morning", "day", "evening", "night"] as const) {
    validateRoutineActivities(value[field], `routines.${field}`, errors);
  }
  if (!Array.isArray(value.specialDayOverrides)) {
    errors.push("routines.specialDayOverrides must be an array");
    return;
  }
  value.specialDayOverrides.forEach((override, index) => {
    if (!isRecord(override)) {
      errors.push(`routines.specialDayOverrides[${index}] must be an object`);
      return;
    }
    requireString(override, "name", errors, `routines.specialDayOverrides[${index}]`);
    validateRoutineActivities(override.activities, `routines.specialDayOverrides[${index}].activities`, errors);
  });
}

function validateRoutineActivities(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must be a non-empty array`);
    return;
  }
  value.forEach((activity: unknown, index: number) => validateRoutineActivity(activity, `${path}[${index}]`, errors));
}

function validateRoutineActivity(value: unknown, path: string, errors: string[]): value is PersonaRoutineActivity {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  requireString(value, "label", errors, path);
  requireString(value, "locationId", errors, path);
  requireString(value, "intent", errors, path);
  return true;
}

function validatePreferences(value: unknown, errors: string[]): void {
  if (!requireRecord(value, "preferences", errors)) return;
  requireStringArray(value, "locations", errors, "preferences");
  requireStringArray(value, "activities", errors, "preferences");
  requireStringArray(value, "likes", errors, "preferences");
  requireStringArray(value, "dislikes", errors, "preferences");
}

function validateRelationships(value: unknown, knownPersonaIds: readonly PersonaId[] | undefined, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("relationships must be a non-empty array");
    return;
  }
  const known = knownPersonaIds ? new Set(knownPersonaIds) : undefined;
  value.forEach((relationship: unknown, index: number) => {
    if (!isRecord(relationship)) {
      errors.push(`relationships[${index}] must be an object`);
      return;
    }
    validateRelationshipSeed(relationship, index, known, errors);
  });
}

function validateRelationshipSeed(value: Record<string, unknown>, index: number, known: Set<string> | undefined, errors: string[]): void {
  const path = `relationships[${index}]`;
  requireString(value, "targetPersonaId", errors, path);
  requireBoundedNumber(value, "affinity", 0, 10, errors, path);
  requireBoundedNumber(value, "trust", 0, 10, errors, path);
  requireBoundedNumber(value, "tension", 0, 10, errors, path);
  requireString(value, "notes", errors, path);
  if (known && typeof value.targetPersonaId === "string" && !known.has(value.targetPersonaId)) {
    errors.push(`${path}.targetPersonaId must reference a known persona id`);
  }
}

function validateContentBoundaries(value: unknown, errors: string[]): void {
  if (!requireRecord(value, "contentBoundaries", errors)) return;
  requireStringArray(value, "canonFidelity", errors, "contentBoundaries");
  requireStringArray(value, "legal", errors, "contentBoundaries");
  requireStringArray(value, "safety", errors, "contentBoundaries");
}

function rejectForbiddenFields(value: Record<string, unknown>, path: string, errors: string[]): void {
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_PERSONA_FIELDS.has(key)) {
      errors.push(`${childPath} is generated/runtime state and is not allowed in immutable persona fixtures`);
    }
    if (isRecord(child)) {
      rejectForbiddenFields(child, childPath, errors);
    } else if (Array.isArray(child)) {
      child.forEach((item, index) => {
        if (isRecord(item)) {
          rejectForbiddenFields(item, `${childPath}[${index}]`, errors);
        }
      });
    }
  }
}

function requireRecord(value: unknown, path: string, errors: string[]): value is Record<string, unknown> {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  return true;
}

function requireString(value: Record<string, unknown>, key: string, errors: string[], path = "persona"): void {
  if (typeof value[key] !== "string" || value[key].trim() === "") {
    errors.push(`${path}.${key} must be a non-empty string`);
  }
}

function requireStringArray(value: Record<string, unknown>, key: string, errors: string[], path = "persona"): void {
  const field = value[key];
  if (!Array.isArray(field) || field.length === 0 || field.some((item) => typeof item !== "string" || item.trim() === "")) {
    errors.push(`${path}.${key} must be a non-empty string array`);
  }
}

function requireOneOf(value: Record<string, unknown>, key: string, options: readonly string[], errors: string[], path = "persona"): void {
  if (typeof value[key] !== "string" || !options.includes(value[key])) {
    errors.push(`${path}.${key} must be one of: ${options.join(", ")}`);
  }
}

function requireBoundedNumber(value: Record<string, unknown>, key: string, min: number, max: number, errors: string[], path: string): void {
  const field = value[key];
  if (typeof field !== "number" || !Number.isFinite(field) || field < min || field > max) {
    errors.push(`${path}.${key} must be a number from ${min} to ${max}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
