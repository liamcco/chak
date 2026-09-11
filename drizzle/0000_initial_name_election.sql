CREATE TYPE "public"."election_phase" AS ENUM('draft');--> statement-breakpoint
CREATE TABLE "elections" (
  "id" uuid PRIMARY KEY NOT NULL,
  "phase" "election_phase" DEFAULT 'draft' NOT NULL,
  "reveal_frontier" integer DEFAULT -1 NOT NULL,
  "presentation_position" integer DEFAULT -1 NOT NULL,
  "state_version" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "elections_singleton" CHECK ("elections"."id" = '00000000-0000-0000-0000-000000000001'::uuid)
);
