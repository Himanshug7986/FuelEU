import { createContext, useContext, type ReactNode } from "react";
import type { FuelEuApiPort } from "../../core/ports/fuelEuApiPort.js";

const Ctx = createContext<FuelEuApiPort | null>(null);

export function ApiProvider({
  api,
  children,
}: {
  api: FuelEuApiPort;
  children: ReactNode;
}): JSX.Element {
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApi(): FuelEuApiPort {
  const v = useContext(Ctx);
  if (!v) throw new Error("ApiProvider missing");
  return v;
}
