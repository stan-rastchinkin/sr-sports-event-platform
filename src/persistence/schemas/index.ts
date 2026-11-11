import { SportSchema } from "./sport.js";
import { SportsEventSchema } from "./sports-event.js";
import { TeamSchema } from "./team.js";

import type { EntitySchema } from "typeorm";

/**
 * Table mappings registered with the DataSource.
 * Order follows foreign keys: sports, then teams, then sports events.
 * The DataSource takes this array directly so NodeNext loads each schema as a normal import.
 */
export const entitySchemas: EntitySchema[] = [
  SportSchema,
  TeamSchema,
  SportsEventSchema,
];
