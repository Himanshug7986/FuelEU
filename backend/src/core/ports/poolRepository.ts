export interface PoolRepositoryPort {
  createPool(year: number, members: { shipId: string; cbBefore: number; cbAfter: number }[]): Promise<string>;
}
