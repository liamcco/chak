CREATE TABLE "suggestions" (
  "id" serial PRIMARY KEY NOT NULL,
  "election_id" uuid NOT NULL REFERENCES "elections"("id") ON DELETE CASCADE,
  "position" integer NOT NULL,
  "suggestion" text NOT NULL,
  "motivation" text NOT NULL,
  CONSTRAINT "suggestions_election_position_unique" UNIQUE("election_id", "position")
);
