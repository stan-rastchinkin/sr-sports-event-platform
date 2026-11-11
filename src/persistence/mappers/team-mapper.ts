import "reflect-metadata";
import { sportId, Team, teamId } from "../../domain/index.js";
import { Service } from "typedi";

import type { TeamRow } from "../schemas/team.js";
import type { Mapper } from "./mapper.js";

@Service()
export class TeamMapper implements Mapper<Team, TeamRow> {
  public toDomain(row: TeamRow): Team {
    return new Team(teamId(row.id), sportId(row.sportId), row.name);
  }

  public toPersistence(team: Team): TeamRow {
    return {
      id: team.id,
      sportId: team.sportId,
      name: team.name,
    };
  }
}
