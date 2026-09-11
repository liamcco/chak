import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, timestamp, uuid, integer } from "drizzle-orm/pg-core";

export const electionPhase = pgEnum("election_phase", ["draft"]);

export const singletonElectionId = "00000000-0000-0000-0000-000000000001";

export const elections = pgTable("elections", {
  id: uuid("id").primaryKey(),
  phase: electionPhase("phase").notNull().default("draft"),
  revealFrontier: integer("reveal_frontier").notNull().default(-1),
  presentationPosition: integer("presentation_position").notNull().default(-1),
  stateVersion: integer("state_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("elections_singleton", sql`${table.id} = ${singletonElectionId}::uuid`)]);
