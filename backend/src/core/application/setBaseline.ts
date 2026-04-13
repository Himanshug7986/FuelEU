import type { RouteRepositoryPort } from "../ports/routeRepository.js";

export async function setBaseline(
  repo: RouteRepositoryPort,
  routeId: string
): Promise<void> {
  const existing = await repo.findByRouteId(routeId);
  if (!existing) throw new Error(`Route ${routeId} not found`);
  await repo.setBaseline(routeId);
}
