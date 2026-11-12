import { z } from "zod";

import type { SportRow } from "../../persistence/schemas/sport.js";

const sportShape = z.object({
  id: z.int(),
  name: z.string(),
});

const football = {
  id: 1,
  name: "Football",
} satisfies z.input<typeof sportShape>;

const basketball = {
  id: 2,
  name: "Basketball",
} satisfies z.input<typeof sportShape>;

export const sportDtoSchema = sportShape.meta({
  examples: [football],
});

export const sportListDtoSchema = z.array(sportDtoSchema).meta({
  examples: [[football, basketball]],
});

export type SportDto = z.output<typeof sportDtoSchema>;

export function toSportDto(sport: Pick<SportRow, "id" | "name">): SportDto {
  return {
    id: sport.id,
    name: sport.name,
  };
}
