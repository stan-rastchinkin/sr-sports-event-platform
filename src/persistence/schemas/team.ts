import { EntitySchema } from "typeorm";

export type TeamRow = {
  id: string;
  sportId: number;
  name: string;
};

export const TeamSchema = new EntitySchema<TeamRow>({
  name: "Team",
  tableName: "teams",
  columns: {
    id: {
      type: "uuid",
      name: "id",
      primary: true,
    },
    sportId: {
      type: "smallint",
      name: "sport_id",
    },
    name: {
      type: "varchar",
      length: 100,
      name: "name",
    },
  },
  uniques: [
    {
      name: "uq_teams_id_sport_id",
      columns: ["id", "sportId"],
    },
  ],
  indices: [
    {
      name: "idx_teams_sport_id",
      columns: ["sportId"],
    },
  ],
  foreignKeys: [
    {
      target: "Sport",
      columnNames: ["sportId"],
      referencedColumnNames: ["id"],
    },
  ],
});
