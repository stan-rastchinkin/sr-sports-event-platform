import { AggregateRoot, DomainError } from "./core/index.js";
import { EventStatus, EventStatusName } from "./event-status/index.js";

import type { EventId, SportId } from "./ids.js";
import type { Team } from "./team.js";

type SportsEventProps = {
  id: EventId;
  sportId: SportId;
  homeTeam: Team;
  awayTeam: Team;
  scheduledAt: Date;
};

type ReconstituteSportsEventProps = SportsEventProps & {
  version: number;
  status: EventStatus;
};

export class SportsEventDomainError extends DomainError {}

export class SportsEvent extends AggregateRoot<EventId> {
  private readonly sportIdValue: SportId;
  private readonly homeTeamValue: Team;
  private readonly awayTeamValue: Team;
  private scheduledAtValue: Date;
  private statusValue: EventStatus;

  private constructor(
    id: EventId,
    version: number,
    sportId: SportId,
    homeTeam: Team,
    awayTeam: Team,
    scheduledAt: Date,
    status: EventStatus,
  ) {
    super(id, version);
    this.sportIdValue = sportId;
    this.homeTeamValue = homeTeam;
    this.awayTeamValue = awayTeam;
    this.scheduledAtValue = new Date(scheduledAt);
    this.statusValue = status;
  }

  public static create(input: SportsEventProps): SportsEvent {
    assertSameSportAndOpponents(input.sportId, input.homeTeam, input.awayTeam);

    return new SportsEvent(
      input.id,
      0,
      input.sportId,
      input.homeTeam,
      input.awayTeam,
      input.scheduledAt,
      EventStatus.create({ status: EventStatusName.Scheduled }),
    );
  }

  public static reconstitute(input: ReconstituteSportsEventProps): SportsEvent {
    assertSameSportAndOpponents(input.sportId, input.homeTeam, input.awayTeam);

    return new SportsEvent(
      input.id,
      input.version,
      input.sportId,
      input.homeTeam,
      input.awayTeam,
      input.scheduledAt,
      input.status,
    );
  }

  public get sportId(): SportId {
    return this.sportIdValue;
  }

  public get homeTeam(): Team {
    return this.homeTeamValue;
  }

  public get awayTeam(): Team {
    return this.awayTeamValue;
  }

  public get scheduledAt(): Date {
    return new Date(this.scheduledAtValue);
  }

  public get status(): EventStatus {
    return EventStatus.create(this.statusValue.state);
  }

  public reschedule(newScheduledAt: Date): void {
    if (this.statusValue.state.status !== EventStatusName.Scheduled) {
      throw new SportsEventDomainError(
        "Only scheduled events can be rescheduled",
        { currentState: this.statusValue.state.status },
      );
    }

    this.scheduledAtValue = new Date(newScheduledAt);
  }

  public start(at: Date): void {
    this.statusValue = this.statusValue.start(at);
  }

  public finish(at: Date): void {
    this.statusValue = this.statusValue.finish(at);
  }

  public cancel(reason: string, at: Date): void {
    this.statusValue = this.statusValue.cancel(reason, at);
  }
}

function assertSameSportAndOpponents(
  sportId: SportId,
  homeTeam: Team,
  awayTeam: Team,
): void {
  if (homeTeam.equals(awayTeam)) {
    throw new SportsEventDomainError("Home and away teams must be different");
  }

  if (homeTeam.sportId !== sportId || awayTeam.sportId !== sportId) {
    throw new SportsEventDomainError(
      "Event and both teams must belong to the same sport",
      {
        homeTeamSportId: homeTeam.sportId,
        awayTeamSportId: awayTeam.sportId,
        eventSportId: sportId,
      }
    );
  }
}
