import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { DistanceCulled } from './DistanceCulled.tsx';
import { KenneyRock } from './KenneyModels.tsx';

export function RockField() {
  const rocks = useGameStore((s) => s.rocks);
  return (
    <group>
      {rocks.map((r, index) => (
        <DistanceCulled key={r.id} center={r.pos} radius={95}>
          <Rock pos={r.pos} depleted={r.state === 'depleted'} variant={index} />
        </DistanceCulled>
      ))}
    </group>
  );
}

function Rock({ pos, depleted, variant }: { pos: number[]; depleted: boolean; variant: number }) {
  const y = groundHeight(pos[0], pos[2]);
  const rotationY = ((variant * 1.73) % 1) * Math.PI * 2;
  const scaleX = depleted ? 0.72 : 0.9 + ((variant * 17) % 5) * 0.04;
  const scaleY = depleted ? 0.72 : 0.9 + ((variant * 11) % 4) * 0.05;
  const scaleZ = depleted ? 0.72 : 0.92 + ((variant * 7) % 5) * 0.035;
  return (
    <group position={[pos[0], y, pos[2]]} rotation={[0, rotationY, 0]} scale={[scaleX, scaleY, scaleZ]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.72, 16]} />
        <meshBasicMaterial color="#2e2b24" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <KenneyRock variant={variant} />
      {depleted && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.55, 14]} />
          <meshBasicMaterial color="#4a3a2a" transparent opacity={0.22} />
        </mesh>
      )}
    </group>
  );
}
