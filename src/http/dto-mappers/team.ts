import { z } from "zod";

import type { TeamRow } from "../../persistence/schemas/team.js";

const teamShape = z.object({
  id: z.uuid(),
  sportId: z.int(),
  name: z.string(),
});

const salzburg = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  sportId: 1,
  name: "Salzburg",
} satisfies z.input<typeof teamShape>;

const sturm = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  sportId: 1,
  name: "Sturm",
} satisfies z.input<typeof teamShape>;

export const teamDtoSchema = teamShape.meta({
  examples: [salzburg, sturm],
});

export const teamListDtoSchema = z.array(teamDtoSchema).meta({
  examples: [[salzburg, sturm]],
});

export type TeamDto = z.output<typeof teamDtoSchema>;

export function toTeamDto(team: Pick<TeamRow, "id" | "sportId" | "name">): TeamDto {
  return {
    id: team.id,
    sportId: team.sportId,
    name: team.name,
  };
}
