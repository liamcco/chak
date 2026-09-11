ALTER TYPE "public"."election_phase" ADD VALUE 'runoff-open';--> statement-breakpoint
ALTER TYPE "public"."election_phase" ADD VALUE 'runoff-closed';--> statement-breakpoint
ALTER TABLE "elections" ADD COLUMN "winner_suggestion_ids" integer[];--> statement-breakpoint
CREATE TABLE "runoff_rounds" (
  "id" serial PRIMARY KEY NOT NULL,
  "election_id" uuid NOT NULL,
  "round_number" integer NOT NULL,
  "finalist_ids" integer[] NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "winner_ids" integer[],
  CONSTRAINT "runoff_round_election_number_unique" UNIQUE("election_id","round_number")
);--> statement-breakpoint
CREATE TABLE "runoff_choices" (
  "id" serial PRIMARY KEY NOT NULL,
  "round_id" integer NOT NULL,
  "participant_id" integer NOT NULL,
  "suggestion_id" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "runoff_choices_participant_round_unique" UNIQUE("round_id","participant_id")
);--> statement-breakpoint
ALTER TABLE "runoff_rounds" ADD CONSTRAINT "runoff_rounds_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "runoff_choices" ADD CONSTRAINT "runoff_choices_round_id_runoff_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "runoff_rounds"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "runoff_choices" ADD CONSTRAINT "runoff_choices_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "runoff_choices" ADD CONSTRAINT "runoff_choices_suggestion_id_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "suggestions"("id") ON DELETE cascade;
