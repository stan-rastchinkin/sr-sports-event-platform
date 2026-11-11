import { DomainError, Entity } from "./core/index.js";

import type { SportId, TeamId } from "./ids.js";

export class TeamDomainError extends DomainError {}

export class Team extends Entity<TeamId> {
  public readonly sportId: SportId;
  public readonly name: string;

  public constructor(id: TeamId, sportId: SportId, name: string) {
    super(id);

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new TeamDomainError("Team name must be nonempty", { name });
    }

    this.sportId = sportId;
    this.name = trimmed;
  }
}
