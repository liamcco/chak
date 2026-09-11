ALTER TYPE "public"."election_phase" ADD VALUE 'final-prepared';--> statement-breakpoint
ALTER TYPE "public"."election_phase" ADD VALUE 'complete';--> statement-breakpoint
ALTER TABLE "elections" ADD COLUMN "finalist_ids" integer[] DEFAULT '{}'::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "elections" ADD COLUMN "vote_token_allowance" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "elections" ADD COLUMN "winner_suggestion_id" integer;