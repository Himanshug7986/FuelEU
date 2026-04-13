import type { RouteRecord } from "../domain/route.js";

export type RouteFilters = {
  vesselType?: string;
  fuelType?: string;
  year?: number;
};

export interface RouteRepositoryPort {
  findAll(filters?: RouteFilters): Promise<RouteRecord[]>;
  findByRouteId(routeId: string): Promise<RouteRecord | null>;
  setBaseline(routeId: string): Promise<void>;
}
