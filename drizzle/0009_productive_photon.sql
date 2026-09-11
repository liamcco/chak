ALTER TYPE "public"."election_phase" ADD VALUE 'final-open' BEFORE 'complete';--> statement-breakpoint
ALTER TYPE "public"."election_phase" ADD VALUE 'final-closed' BEFORE 'complete';--> statement-breakpoint
ALTER TYPE "public"."election_phase" ADD VALUE 'runoff-open' BEFORE 'complete';--> statement-breakpoint
ALTER TYPE "public"."election_phase" ADD VALUE 'runoff-closed' BEFORE 'complete';--> statement-breakpoint
CREATE TABLE "final_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_id" uuid NOT NULL,
	"participant_id" integer NOT NULL,
	"suggestion_id" integer NOT NULL,
	"vote_tokens" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "final_votes_participant_suggestion_unique" UNIQUE("participant_id","suggestion_id"),
	CONSTRAINT "final_votes_non_negative" CHECK ("final_votes"."vote_tokens" >= 0)
);
--> statement-breakpoint
CREATE TABLE "runoff_choices" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"participant_id" integer NOT NULL,
	"suggestion_id" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runoff_choices_participant_round_unique" UNIQUE("round_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "runoff_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"finalist_ids" integer[] NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"winner_ids" integer[],
	CONSTRAINT "runoff_round_election_number_unique" UNIQUE("election_id","round_number")
);
--> statement-breakpoint
ALTER TABLE "elections" ADD COLUMN "winner_suggestion_ids" integer[];--> statement-breakpoint
ALTER TABLE "elections" ADD COLUMN "result_revealed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "final_votes" ADD CONSTRAINT "final_votes_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_votes" ADD CONSTRAINT "final_votes_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_votes" ADD CONSTRAINT "final_votes_suggestion_id_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runoff_choices" ADD CONSTRAINT "runoff_choices_round_id_runoff_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."runoff_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runoff_choices" ADD CONSTRAINT "runoff_choices_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runoff_choices" ADD CONSTRAINT "runoff_choices_suggestion_id_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runoff_rounds" ADD CONSTRAINT "runoff_rounds_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE no action;