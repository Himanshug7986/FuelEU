import cors from "cors";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { TARGET_INTENSITY_GCO2E_PER_MJ } from "../../../shared/constants.js";
import { listRoutes } from "../../../core/application/listRoutes.js";
import { setBaseline } from "../../../core/application/setBaseline.js";
import { computeRouteComparison } from "../../../core/application/computeComparison.js";
import { computeAndStoreCB } from "../../../core/application/computeCB.js";
import {
  getAdjustedCBForShip,
  listAdjustedCBForYear,
} from "../../../core/application/getAdjustedCB.js";
import { bankSurplus } from "../../../core/application/bankSurplus.js";
import { applyBanked } from "../../../core/application/applyBanked.js";
import { getBankingRecords } from "../../../core/application/getBankingRecords.js";
import { createPool } from "../../../core/application/createPool.js";
import type { RouteRepositoryPort } from "../../../core/ports/routeRepository.js";
import type { RouteDataForCompliancePort } from "../../../core/ports/routeDataForCompliancePort.js";
import type { ShipComplianceRepositoryPort } from "../../../core/ports/shipComplianceRepository.js";
import type { BankRepositoryPort } from "../../../core/ports/bankRepository.js";
import type { PoolRepositoryPort } from "../../../core/ports/poolRepository.js";

export type AppDeps = {
  routeRepo: RouteRepositoryPort;
  routeData: RouteDataForCompliancePort;
  complianceRepo: ShipComplianceRepositoryPort;
  bankRepo: BankRepositoryPort;
  poolRepo: PoolRepositoryPort;
  defaultShipId: string;
};

function sendError(res: Response, err: unknown, status = 400) {
  const message = err instanceof Error ? err.message : "Error";
  res.status(status).json({ error: message });
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.get("/routes", async (req, res, next) => {
    try {
      const vesselType = req.query.vesselType as string | undefined;
      const fuelType = req.query.fuelType as string | undefined;
      const yearRaw = req.query.year as string | undefined;
      const year = yearRaw !== undefined ? Number(yearRaw) : undefined;
      const routes = await listRoutes(deps.routeRepo, {
        vesselType: vesselType || undefined,
        fuelType: fuelType || undefined,
        year: Number.isFinite(year) ? year : undefined,
      });
      res.json(
        routes.map((r) => ({
          routeId: r.routeId,
          vesselType: r.vesselType,
          fuelType: r.fuelType,
          year: r.year,
          ghgIntensity: r.ghgIntensity,
          fuelConsumption: r.fuelConsumptionT,
          distance: r.distanceKm,
          totalEmissions: r.totalEmissionsT,
          shipId: r.shipId,
        }))
      );
    } catch (e) {
      next(e);
    }
  });

  app.post("/routes/:routeId/baseline", async (req, res, next) => {
    try {
      await setBaseline(deps.routeRepo, req.params.routeId);
      res.status(204).end();
    } catch (e) {
      if (e instanceof Error && e.message.includes("not found")) {
        sendError(res, e, 404);
        return;
      }
      next(e);
    }
  });

  app.get("/routes/comparison", async (_req, res, next) => {
    try {
      const result = await computeRouteComparison(deps.routeRepo, TARGET_INTENSITY_GCO2E_PER_MJ);
      res.json({
        baseline: result.baseline,
        targetIntensity: result.targetIntensity,
        comparisons: result.comparisons.map((c) => ({
          routeId: c.routeId,
          ghgIntensity: c.ghgIntensity,
          percentDiff: c.percentDiff,
          compliant: c.compliant,
        })),
      });
    } catch (e) {
      if (e instanceof Error && e.message.includes("No baseline")) {
        sendError(res, e, 400);
        return;
      }
      next(e);
    }
  });

  app.get("/compliance/cb", async (req, res, next) => {
    try {
      const year = Number(req.query.year);
      const shipId = (req.query.shipId as string) || deps.defaultShipId;
      if (!Number.isFinite(year)) {
        sendError(res, new Error("year is required"));
        return;
      }
      const out = await computeAndStoreCB(deps.routeData, deps.complianceRepo, shipId, year);
      res.json({
        shipId: out.shipId,
        year: out.year,
        cbGco2eq: out.cbGco2eq,
        energyMj: out.energyMj,
      });
    } catch (e) {
      next(e);
    }
  });

  app.get("/compliance/adjusted-cb", async (req, res, next) => {
    try {
      const year = Number(req.query.year);
      if (!Number.isFinite(year)) {
        sendError(res, new Error("year is required"));
        return;
      }
      const shipId = req.query.shipId as string | undefined;
      if (shipId) {
        const one = await getAdjustedCBForShip(deps.complianceRepo, deps.bankRepo, shipId, year);
        res.json({
          year,
          ships: [
            {
              shipId: one.shipId,
              adjustedCb: one.adjustedCb,
              bankedAmount: one.bankedAmount,
            },
          ],
        });
        return;
      }
      const list = await listAdjustedCBForYear(deps.complianceRepo, deps.bankRepo, year);
      res.json({
        year,
        ships: list.map((s) => ({
          shipId: s.shipId,
          adjustedCb: s.adjustedCb,
          bankedAmount: s.bankedAmount,
        })),
      });
    } catch (e) {
      next(e);
    }
  });

  app.get("/banking/records", async (req, res, next) => {
    try {
      const year = Number(req.query.year);
      const shipId = (req.query.shipId as string) || deps.defaultShipId;
      if (!Number.isFinite(year)) {
        sendError(res, new Error("year is required"));
        return;
      }
      const records = await getBankingRecords(deps.bankRepo, shipId, year);
      res.json({ shipId, year, records });
    } catch (e) {
      next(e);
    }
  });

  app.post("/banking/bank", async (req, res, _next) => {
    try {
      const year = Number(req.body?.year);
      const shipId = (req.body?.shipId as string) || deps.defaultShipId;
      if (!Number.isFinite(year)) {
        sendError(res, new Error("year is required"));
        return;
      }
      const out = await bankSurplus(deps.complianceRepo, deps.bankRepo, shipId, year);
      res.status(201).json({ shipId, year, banked: out.banked });
    } catch (e) {
      sendError(res, e);
    }
  });

  app.post("/banking/apply", async (req, res, _next) => {
    try {
      const year = Number(req.body?.year);
      const shipId = (req.body?.shipId as string) || deps.defaultShipId;
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(year) || !Number.isFinite(amount)) {
        sendError(res, new Error("year and amount are required"));
        return;
      }
      const result = await applyBanked(deps.complianceRepo, deps.bankRepo, shipId, year, amount);
      res.json({
        shipId,
        year,
        cb_before: result.cbBefore,
        applied: result.applied,
        cb_after: result.cbAfter,
      });
    } catch (e) {
      sendError(res, e);
    }
  });

  app.post("/pools", async (req, res, _next) => {
    try {
      const year = Number(req.body?.year);
      const members = req.body?.members as { shipId: string; adjustedCb: number }[] | undefined;
      if (!Number.isFinite(year) || !Array.isArray(members) || members.length === 0) {
        sendError(res, new Error("year and members[] are required"));
        return;
      }
      const result = await createPool(deps.poolRepo, {
        year,
        members: members.map((m) => ({
          shipId: m.shipId,
          adjustedCb: Number(m.adjustedCb),
        })),
      });
      res.status(201).json({
        poolId: result.poolId,
        poolSum: result.poolSum,
        members: result.members,
      });
    } catch (e) {
      sendError(res, e);
    }
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    sendError(res, err, 500);
  });

  return app;
}
