import { EntitySchema } from "typeorm";

export type SportRow = {
  id: number;
  name: string;
};

export const SportSchema = new EntitySchema<SportRow>({
  name: "Sport",
  tableName: "sports",
  columns: {
    id: {
      type: "smallint",
      name: "id",
      primary: true,
    },
    name: {
      type: "varchar",
      length: 100,
      name: "name",
    },
  },
});
