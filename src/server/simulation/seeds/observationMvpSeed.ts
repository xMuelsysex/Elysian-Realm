import { pilotPersonas } from "../../personas/index.js";
import type { AgentRuntimeState, LocationRef, WorldSnapshot } from "../../../shared/contracts/index.js";
import type { AgentId, LocationId, PersonaId, WorldId } from "../../../shared/domain/index.js";

export const OBSERVATION_MVP_SEED_ID = "mvp-current-roster-v1" as const;
export const OBSERVATION_MVP_WORLD_ID: WorldId = "world_elysian_observation_mvp";
export const OBSERVATION_MVP_INITIAL_TIME = "2026-05-31T06:00:00.000Z";
export const OBSERVATION_MVP_INITIAL_STEP_ID = "step_0600_000";
export const OBSERVATION_MVP_TIME_SCALE = 60;

export const observationMvpLocations: LocationRef[] = [
  {
    id: "atrium",
    displayName: "Atrium",
    description: "A bright crossing space where residents first notice the shape of the day.",
  },
  {
    id: "garden",
    displayName: "Garden",
    description: "A quiet outdoor room for gentle hosting, reflection, and low-pressure meetings.",
  },
  {
    id: "lounge",
    displayName: "Lounge",
    description: "A shared rest space prepared for conversation without formal obligation.",
  },
  {
    id: "archives",
    displayName: "Archives",
    description: "A source and memory-adjacent room used for records, diagnostics, and replay hooks.",
  },
  {
    id: "training-hall",
    displayName: "Training Hall",
    description: "A disciplined room for solitary routines, practical readiness, and quiet focus.",
  },
  {
    id: "overlook",
    displayName: "Overlook",
    description: "A distant vantage point for watchful pauses and late-day observation.",
  },
  {
    id: "quarters",
    displayName: "Quarters",
    description: "A private resting area used by residents who need low-interruption recovery.",
  },
];

const LOCATION_IDS = new Set<LocationId>(observationMvpLocations.map((location) => location.id));

export function createObservationMvpSnapshot(): WorldSnapshot {
  const agents = pilotPersonas.map<AgentRuntimeState>((persona) => {
    const locationId = persona.routines.morning[0]?.locationId;
    if (!locationId || !LOCATION_IDS.has(locationId)) {
      throw new Error(`Persona ${persona.id} has no valid morning routine location for observation MVP seed`);
    }

    return {
      id: toAgentId(persona.id),
      personaId: persona.id,
      displayName: persona.displayName,
      status: "idle",
      locationId,
      cooldowns: {},
      relationshipRefs: persona.relationships.map((relationship) => relationship.targetPersonaId),
    };
  });

  return {
    id: OBSERVATION_MVP_WORLD_ID,
    status: "paused",
    currentTime: OBSERVATION_MVP_INITIAL_TIME,
    timeScale: OBSERVATION_MVP_TIME_SCALE,
    locations: observationMvpLocations.map((location) => ({ ...location })),
    agents,
    activeConversations: [],
    queuedInputs: [],
    lastStepId: OBSERVATION_MVP_INITIAL_STEP_ID,
  };
}

export function toAgentId(personaId: PersonaId): AgentId {
  return `agent_${personaId}`;
}
