import type { RouteRecord } from "../domain/route.js";
import type { RouteFilters, RouteRepositoryPort } from "../ports/routeRepository.js";

export async function listRoutes(
  repo: RouteRepositoryPort,
  filters?: RouteFilters
): Promise<RouteRecord[]> {
  return repo.findAll(filters);
}
