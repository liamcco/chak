ALTER TYPE "public"."election_phase" ADD VALUE 'final-open';--> statement-breakpoint
ALTER TYPE "public"."election_phase" ADD VALUE 'final-closed';--> statement-breakpoint
CREATE TABLE "final_votes" (
  "id" serial PRIMARY KEY NOT NULL,
  "election_id" uuid NOT NULL,
  "participant_id" integer NOT NULL,
  "suggestion_id" integer NOT NULL,
  "vote_tokens" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "final_votes_participant_suggestion_unique" UNIQUE("participant_id","suggestion_id"),
  CONSTRAINT "final_votes_non_negative" CHECK ("final_votes"."vote_tokens" >= 0)
);--> statement-breakpoint
ALTER TABLE "final_votes" ADD CONSTRAINT "final_votes_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_votes" ADD CONSTRAINT "final_votes_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_votes" ADD CONSTRAINT "final_votes_suggestion_id_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE cascade ON UPDATE no action;
