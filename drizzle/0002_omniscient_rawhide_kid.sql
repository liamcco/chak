CREATE TABLE "participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_id" uuid NOT NULL,
	"display_label" text NOT NULL,
	"invitation_token" text NOT NULL,
	CONSTRAINT "participants_invitation_token_unique" UNIQUE("invitation_token"),
	CONSTRAINT "participants_election_display_label_unique" UNIQUE("election_id","display_label")
);
ALTER TABLE "participants" ADD CONSTRAINT "participants_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE no action;
