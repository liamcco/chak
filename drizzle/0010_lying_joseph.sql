CREATE TABLE "result_snapshots" (
	"election_id" uuid PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "result_snapshots" ADD CONSTRAINT "result_snapshots_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE no action;