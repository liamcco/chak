import { db } from "@/server/db/client";
import { elections, singletonElectionId } from "@/server/db/schema";
import type { NameElectionStore } from "./service";

export const postgresNameElectionStore: NameElectionStore = {
  transaction: (operation) => db.transaction(async (transaction) => operation({
    findElection: async () => {
      const election = await transaction.query.elections.findFirst();
      return election ? { id: election.id, phase: election.phase } : null;
    },
    insertDraftElection: async () => {
      const [election] = await transaction.insert(elections).values({ id: singletonElectionId, phase: "draft" }).onConflictDoNothing().returning();
      if (!election) {
        const existing = await transaction.query.elections.findFirst();
        if (!existing) throw new Error("The Draft Name Election could not be established");
        return { id: existing.id, phase: existing.phase };
      }
      return { id: election.id, phase: election.phase };
    },
  })),
};
