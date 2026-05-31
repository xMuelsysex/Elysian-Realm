import type { Authorship, PersonaId, LocationId } from "../domain/index.js";

export const PERSONA_SCHEMA_VERSION = "persona.v1" as const;

export interface PersonaSpec {
  schemaVersion: typeof PERSONA_SCHEMA_VERSION;
  id: PersonaId;
  displayName: string;
  aliases: string[];
  authorship: Authorship;
  sourceNotes: string;
  updatedAt: string;
  profile: PersonaProfile;
  speech: PersonaSpeech;
  personality: PersonaPersonality;
  routines: PersonaRoutines;
  preferences: PersonaPreferences;
  relationships: PersonaRelationshipSeed[];
  contentBoundaries: PersonaContentBoundaries;
  migrationNotes?: string;
}

export interface PersonaProfile {
  archetype: string;
  values: string[];
  longTermGoals: string[];
  constraints: string[];
}

export interface PersonaSpeech {
  tone: string;
  cadence: string;
  preferredAddressForms: string[];
  tabooTopics: string[];
  tabooPhrases: string[];
}

export interface PersonaPersonality {
  traits: string[];
  strengths: string[];
  flaws: string[];
  emotionalTriggers: string[];
}

export interface PersonaRoutines {
  morning: PersonaRoutineActivity[];
  day: PersonaRoutineActivity[];
  evening: PersonaRoutineActivity[];
  night: PersonaRoutineActivity[];
  specialDayOverrides: PersonaRoutineOverride[];
}

export interface PersonaRoutineActivity {
  label: string;
  locationId: LocationId;
  intent: string;
}

export interface PersonaRoutineOverride {
  name: string;
  activities: PersonaRoutineActivity[];
}

export interface PersonaPreferences {
  locations: LocationId[];
  activities: string[];
  likes: string[];
  dislikes: string[];
}

export interface PersonaRelationshipSeed {
  targetPersonaId: PersonaId;
  affinity: number;
  trust: number;
  tension: number;
  notes: string;
}

export interface PersonaContentBoundaries {
  canonFidelity: string[];
  legal: string[];
  safety: string[];
}
