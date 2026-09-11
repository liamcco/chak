export type DraftNameElection = { id: string; phase: "draft" };

export type NameElectionTransaction = {
  findElection(): Promise<DraftNameElection | null>;
  insertDraftElection(): Promise<DraftNameElection>;
};

export type NameElectionStore = {
  transaction<T>(operation: (transaction: NameElectionTransaction) => Promise<T>): Promise<T>;
};

export type NameElectionService = {
  establishDraft(): Promise<DraftNameElection>;
  getDraft(): Promise<DraftNameElection | null>;
};

/** The sole application-service boundary for Name Election commands and queries. */
export function createNameElectionService(store: NameElectionStore): NameElectionService {
  return {
    establishDraft: () => store.transaction(async (transaction) =>
      (await transaction.findElection()) ?? transaction.insertDraftElection(),
    ),
    getDraft: () => store.transaction((transaction) => transaction.findElection()),
  };
}
