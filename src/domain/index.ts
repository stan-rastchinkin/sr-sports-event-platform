export {
  AggregateRoot,
  DomainError,
  Entity,
  validateAgainstSchema,
} from "./core/index.js";
export {
  EventStatus,
  SportsEventStatusDomainError,
} from "./event-status/index.js";
export { eventId, sportId, teamId } from "./ids.js";
export { SportsEvent, SportsEventDomainError } from "./sports-event.js";
export { Team, TeamDomainError } from "./team.js";

export type { EventKind, EventState } from "./event-status/index.js";
export type { EventId, SportId, TeamId } from "./ids.js";
