export type WorldStatus = "running" | "paused" | "stopped" | "archived";
export type AgentStatus = "idle" | "planning" | "moving" | "conversing" | "reflecting" | "waiting" | "error";
export type ConversationState = "invited" | "walkingOver" | "participating" | "ending" | "ended";
export type MemoryType = "observation" | "action" | "conversation" | "relationship" | "plan" | "reflection" | "intervention";
export type InterventionKind = "observerCommand" | "realmEvent" | "directPrivateMessage";
export type OperationKind = "dailyPlan" | "actionProposal" | "conversationTurn" | "conversationSummary" | "reflection" | "importanceScore" | "embedding";
export type OperationStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "timedOut";
export type PlanItemKind = "move" | "performActivity" | "startConversation" | "wait" | "reflect";
