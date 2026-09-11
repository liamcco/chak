ALTER TABLE "elections" ADD COLUMN IF NOT EXISTS "result_revealed_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "result_snapshots" (
	"election_id" uuid PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'result_snapshots_election_id_elections_id_fk'
	) THEN
		ALTER TABLE "result_snapshots"
			ADD CONSTRAINT "result_snapshots_election_id_elections_id_fk"
			FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE cascade;
	END IF;
END $$;
