import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSportsTeamsAndEvents1794416849807 implements MigrationInterface {
    name = 'CreateSportsTeamsAndEvents1794416849807'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "sports" (
                "id" smallint NOT NULL,
                "name" character varying(100) NOT NULL,
                CONSTRAINT "PK_4fa1063d368e1fd68ea63c7d860" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "teams" (
                "id" uuid NOT NULL,
                "sport_id" smallint NOT NULL,
                "name" character varying(100) NOT NULL,
                CONSTRAINT "uq_teams_id_sport_id" UNIQUE ("id", "sport_id"),
                CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_teams_sport_id" ON "teams" ("sport_id")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."sports_event_status" AS ENUM(
                'scheduled',
                'in_progress',
                'finished',
                'cancelled'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "sports_events" (
                "id" uuid NOT NULL,
                "sport_id" smallint NOT NULL,
                "home_team_id" uuid NOT NULL,
                "away_team_id" uuid NOT NULL,
                "scheduled_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "status" "public"."sports_event_status" NOT NULL,
                "started_at" TIMESTAMP WITH TIME ZONE,
                "finished_at" TIMESTAMP WITH TIME ZONE,
                "cancelled_at" TIMESTAMP WITH TIME ZONE,
                "cancellation_reason" character varying(500),
                "version" integer NOT NULL,
                CONSTRAINT "chk_sports_events_different_teams" CHECK ("home_team_id" <> "away_team_id"),
                CONSTRAINT "chk_sports_events_version" CHECK ("version" >= 1),
                CONSTRAINT "PK_d7efcae5f79d385f1d1f9b9e50b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_sports_events_home_team_status_date" ON "sports_events" ("home_team_id", "status", "scheduled_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_sports_events_away_team_status_date" ON "sports_events" ("away_team_id", "status", "scheduled_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_sports_events_sport_status_date" ON "sports_events" ("sport_id", "status", "scheduled_at")
        `);
        await queryRunner.query(`
            ALTER TABLE "teams"
            ADD CONSTRAINT "FK_f1cbcfd9d4a42fd2f74dfd228a3" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "sports_events"
            ADD CONSTRAINT "FK_697a93a69782553bd275cfbcf28" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "sports_events"
            ADD CONSTRAINT "FK_ebf73f8a9cfff2c46f0d1f4a57c" FOREIGN KEY ("home_team_id", "sport_id") REFERENCES "teams"("id", "sport_id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "sports_events"
            ADD CONSTRAINT "FK_cd1e1d136571c854b26671eabae" FOREIGN KEY ("away_team_id", "sport_id") REFERENCES "teams"("id", "sport_id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sports_events" DROP CONSTRAINT "FK_cd1e1d136571c854b26671eabae"
        `);
        await queryRunner.query(`
            ALTER TABLE "sports_events" DROP CONSTRAINT "FK_ebf73f8a9cfff2c46f0d1f4a57c"
        `);
        await queryRunner.query(`
            ALTER TABLE "sports_events" DROP CONSTRAINT "FK_697a93a69782553bd275cfbcf28"
        `);
        await queryRunner.query(`
            ALTER TABLE "teams" DROP CONSTRAINT "FK_f1cbcfd9d4a42fd2f74dfd228a3"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_sports_events_sport_status_date"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_sports_events_away_team_status_date"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_sports_events_home_team_status_date"
        `);
        await queryRunner.query(`
            DROP TABLE "sports_events"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."sports_event_status"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."idx_teams_sport_id"
        `);
        await queryRunner.query(`
            DROP TABLE "teams"
        `);
        await queryRunner.query(`
            DROP TABLE "sports"
        `);
    }

}
