import { LlmProviderError } from "./provider.js";

export function parseStructuredJsonObject(content: string, schema?: Record<string, unknown>): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (cause) {
    throw new LlmProviderError("LLM_STRUCTURED_OUTPUT_ERROR", "LLM structured output was not valid JSON.", {
      details: { reason: readErrorMessage(cause) },
      cause,
    });
  }

  if (!isRecord(parsed)) {
    throw new LlmProviderError("LLM_STRUCTURED_OUTPUT_ERROR", "LLM structured output must be a JSON object.", {
      details: { actualType: describeJsonType(parsed) },
    });
  }

  if (schema) {
    validateJsonSchemaSubset(parsed, schema, "output");
  }

  return parsed;
}

export function validateJsonSchemaSubset(value: unknown, schema: Record<string, unknown>, path = "value"): void {
  const schemaType = schema.type;
  if (typeof schemaType === "string") {
    validateJsonType(value, schemaType, path);
  }

  const effectiveType = typeof schemaType === "string" ? schemaType : inferJsonType(value);
  if (effectiveType === "object") {
    validateObjectSchema(value, schema, path);
  }
  if (effectiveType === "array") {
    validateArraySchema(value, schema, path);
  }
}

function validateObjectSchema(value: unknown, schema: Record<string, unknown>, path: string): void {
  if (!isRecord(value)) {
    throw structuredError(`${path} must be a JSON object`, { path, actualType: describeJsonType(value) });
  }

  const properties = isRecord(schema.properties) ? schema.properties : {};
  const required = readStringArray(schema.required, `${path}.required`);

  for (const requiredKey of required) {
    if (!(requiredKey in value)) {
      throw structuredError(`${path}.${requiredKey} is required`, { path: `${path}.${requiredKey}` });
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        throw structuredError(`${path}.${key} is not allowed`, { path: `${path}.${key}` });
      }
    }
  }

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (!(key in value)) continue;
    if (!isRecord(propertySchema)) continue;
    validateJsonSchemaSubset(value[key], propertySchema, `${path}.${key}`);
  }
}

function validateArraySchema(value: unknown, schema: Record<string, unknown>, path: string): void {
  if (!Array.isArray(value)) {
    throw structuredError(`${path} must be a JSON array`, { path, actualType: describeJsonType(value) });
  }

  if (!isRecord(schema.items)) return;
  value.forEach((item, index) => validateJsonSchemaSubset(item, schema.items as Record<string, unknown>, `${path}[${index}]`));
}

function validateJsonType(value: unknown, schemaType: string, path: string): void {
  if (schemaType === "string" && typeof value !== "string") {
    throw typeError(path, "string", value);
  }
  if (schemaType === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    throw typeError(path, "number", value);
  }
  if (schemaType === "integer" && (typeof value !== "number" || !Number.isInteger(value))) {
    throw typeError(path, "integer", value);
  }
  if (schemaType === "boolean" && typeof value !== "boolean") {
    throw typeError(path, "boolean", value);
  }
  if (schemaType === "object" && !isRecord(value)) {
    throw typeError(path, "object", value);
  }
  if (schemaType === "array" && !Array.isArray(value)) {
    throw typeError(path, "array", value);
  }
}

function typeError(path: string, expectedType: string, value: unknown): LlmProviderError {
  return structuredError(`${path} must be ${expectedType}`, { path, expectedType, actualType: describeJsonType(value) });
}

function structuredError(message: string, details: Record<string, unknown>): LlmProviderError {
  return new LlmProviderError("LLM_STRUCTURED_OUTPUT_ERROR", message, { details });
}

function readStringArray(value: unknown, path: string): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim() !== "")) {
    return [...value];
  }
  throw structuredError(`${path} must be a string array`, { path, actualType: describeJsonType(value) });
}

function inferJsonType(value: unknown): string {
  if (Array.isArray(value)) return "array";
  if (isRecord(value)) return "object";
  return typeof value;
}

function describeJsonType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function readErrorMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
