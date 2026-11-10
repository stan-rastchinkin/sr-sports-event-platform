import type { EntitySchema } from "typeorm";

/**
 * Table mappings registered with the DataSource.
 * The first EntitySchema is added with persistence work and listed here.
 * The DataSource takes this array directly so NodeNext loads each schema as a normal import.
 */
export const entitySchemas: EntitySchema[] = [];
