export interface SpatialGrid<T> {
  cellSize: number;
  cells: Map<string, T[]>;
}

function cellKey(x: number, z: number): string {
  return `${x}:${z}`;
}

export function buildSpatialGrid<T>(
  items: readonly T[],
  getPosition: (item: T) => readonly [number, number],
  cellSize = 12,
): SpatialGrid<T> {
  const cells = new Map<string, T[]>();
  for (const item of items) {
    const [x, z] = getPosition(item);
    const key = cellKey(Math.floor(x / cellSize), Math.floor(z / cellSize));
    const cell = cells.get(key);
    if (cell) cell.push(item);
    else cells.set(key, [item]);
  }
  return { cellSize, cells };
}

export function querySpatialGrid<T>(
  grid: SpatialGrid<T>,
  x: number,
  z: number,
  radius: number,
): T[] {
  const result: T[] = [];
  const minX = Math.floor((x - radius) / grid.cellSize);
  const maxX = Math.floor((x + radius) / grid.cellSize);
  const minZ = Math.floor((z - radius) / grid.cellSize);
  const maxZ = Math.floor((z + radius) / grid.cellSize);
  for (let cellX = minX; cellX <= maxX; cellX += 1) {
    for (let cellZ = minZ; cellZ <= maxZ; cellZ += 1) {
      const cell = grid.cells.get(cellKey(cellX, cellZ));
      if (cell) result.push(...cell);
    }
  }
  return result;
}
