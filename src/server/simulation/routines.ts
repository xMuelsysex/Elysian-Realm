import type { PlanAction } from "../../shared/contracts/index.js";
import type { LocationId, PersonaId } from "../../shared/domain/index.js";

export type RoutinePeriod = "morning" | "day" | "evening" | "night";

export interface ConfiguredRoutineActivity {
  locationId: LocationId;
  intent: string;
}

export interface ActiveRoutineSelection {
  personaId: PersonaId;
  period: RoutinePeriod;
  index: number;
  routineId: string;
  planId: string;
  locationId: LocationId;
  intent: string;
}

export function resolveRoutinePeriod(time: string): RoutinePeriod {
  const hour = new Date(time).getUTCHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "day";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export function selectActiveRoutine(
  personaId: PersonaId,
  period: RoutinePeriod,
  routines: readonly ConfiguredRoutineActivity[],
): ActiveRoutineSelection | undefined {
  const routine = routines[0];
  if (!routine) return undefined;
  return {
    personaId,
    period,
    index: 0,
    routineId: createRoutineId(personaId, period, 0),
    planId: createRoutinePlanId(personaId, period),
    locationId: routine.locationId,
    intent: routine.intent,
  };
}

export function createRoutineAction(routine: ActiveRoutineSelection, startsAt: string): PlanAction {
  return {
    id: routine.routineId,
    kind: "performActivity",
    startsAt,
    locationId: routine.locationId,
    intent: routine.intent,
  };
}

function createRoutineId(personaId: PersonaId, period: RoutinePeriod, index: number): string {
  return `${personaId}.${period}.${index}`;
}

function createRoutinePlanId(personaId: PersonaId, period: RoutinePeriod): string {
  return `${personaId}.${period}`;
}
