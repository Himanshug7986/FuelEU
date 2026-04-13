import {
  allocatePoolGreedy,
  assertPoolFeasible,
  validatePoolInvariants,
} from "../domain/pooling.js";
import type { PoolRepositoryPort } from "../ports/poolRepository.js";

export type CreatePoolInput = {
  year: number;
  members: { shipId: string; adjustedCb: number }[];
};

export type CreatePoolResult = {
  poolId: string;
  poolSum: number;
  members: { shipId: string; cbBefore: number; cbAfter: number }[];
};

export async function createPool(
  poolRepo: PoolRepositoryPort,
  input: CreatePoolInput
): Promise<CreatePoolResult> {
  const memberInputs = input.members.map((m) => ({
    shipId: m.shipId,
    cbBefore: m.adjustedCb,
  }));

  const poolSum = memberInputs.reduce((a, m) => a + m.cbBefore, 0);
  assertPoolFeasible(memberInputs);

  const allocated = allocatePoolGreedy(memberInputs);
  validatePoolInvariants(allocated, poolSum);

  const poolId = await poolRepo.createPool(input.year, allocated);

  return {
    poolId,
    poolSum,
    members: allocated.map((m) => ({
      shipId: m.shipId,
      cbBefore: m.cbBefore,
      cbAfter: m.cbAfter,
    })),
  };
}
