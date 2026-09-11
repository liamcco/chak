import { postgresNameElectionStore } from "./postgres-store";
import { createNameElectionService } from "./service";

export const nameElectionService = createNameElectionService(postgresNameElectionStore);
