import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, timestamp, uuid, integer, serial, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

export const electionPhase = pgEnum("election_phase", ["draft", "approval-open", "approval-closed"]);
export const approvalChoice = pgEnum("approval_choice", ["yay", "nay"]);

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

export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  electionId: uuid("election_id").notNull().references(() => elections.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  suggestion: text("suggestion").notNull(),
  motivation: text("motivation").notNull(),
}, (table) => [unique("suggestions_election_position_unique").on(table.electionId, table.position)]);

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  electionId: uuid("election_id").notNull().references(() => elections.id, { onDelete: "cascade" }),
  displayLabel: text("display_label").notNull(),
  invitationToken: text("invitation_token").notNull().unique(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
}, (table) => [
  unique("participants_election_display_label_unique").on(table.electionId, table.displayLabel),
  uniqueIndex("participants_election_display_label_normalized_unique").on(table.electionId, sql`lower(${table.displayLabel})`),
]);

export const approvalChoices = pgTable("approval_choices", {
  id: serial("id").primaryKey(),
  electionId: uuid("election_id").notNull().references(() => elections.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  suggestionId: integer("suggestion_id").notNull().references(() => suggestions.id, { onDelete: "cascade" }),
  choice: approvalChoice("choice").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("approval_choices_participant_suggestion_unique").on(table.participantId, table.suggestionId)]);
