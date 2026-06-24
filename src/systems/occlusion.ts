interface OcclusionArgs {
  objectX: number;
  objectZ: number;
  playerX: number;
  playerZ: number;
  cameraX: number;
  cameraZ: number;
  radius: number;
  minOpacity?: number;
}

export function occlusionOpacity({
  objectX,
  objectZ,
  playerX,
  playerZ,
  cameraX,
  cameraZ,
  radius,
  minOpacity = 0.36,
}: OcclusionArgs): number {
  const vx = playerX - cameraX;
  const vz = playerZ - cameraZ;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 1e-5) return 1;

  const t = ((objectX - cameraX) * vx + (objectZ - cameraZ) * vz) / lenSq;
  if (t <= 0.08 || t >= 0.96) return 1;

  const closestX = cameraX + vx * t;
  const closestZ = cameraZ + vz * t;
  const distToRay = Math.hypot(objectX - closestX, objectZ - closestZ);
  const playerDist = Math.hypot(objectX - playerX, objectZ - playerZ);
  if (distToRay > radius || playerDist > 18) return 1;

  const strength = 1 - Math.min(1, distToRay / radius);
  return 1 - (1 - minOpacity) * strength;
}
