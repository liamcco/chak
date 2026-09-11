ALTER TYPE "public"."election_phase" ADD VALUE 'approval-open';--> statement-breakpoint
ALTER TYPE "public"."election_phase" ADD VALUE 'approval-closed';--> statement-breakpoint
CREATE TYPE "public"."approval_choice" AS ENUM('yay', 'nay');--> statement-breakpoint
CREATE TABLE "approval_choices" (
  "id" serial PRIMARY KEY NOT NULL,
  "election_id" uuid NOT NULL REFERENCES "elections"("id") ON DELETE cascade,
  "participant_id" integer NOT NULL REFERENCES "participants"("id") ON DELETE cascade,
  "suggestion_id" integer NOT NULL REFERENCES "suggestions"("id") ON DELETE cascade,
  "choice" "approval_choice" NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "approval_choices_participant_suggestion_unique" UNIQUE("participant_id", "suggestion_id")
);
