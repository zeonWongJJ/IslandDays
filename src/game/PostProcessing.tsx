import { EffectComposer, Bloom, Vignette, HueSaturation, BrightnessContrast } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useGameStore } from '../store/useGameStore.ts';

export function PostProcessing() {
  const hour = useGameStore((s) => s.clock.minutes / 60);
  const isNight = hour < 5 || hour > 19.5;

  return (
    <EffectComposer>
      <Bloom
        intensity={isNight ? 0.55 : 0.12}
        luminanceThreshold={isNight ? 0.4 : 0.7}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <HueSaturation
        hue={0.01}
        saturation={0.35}
        blendFunction={BlendFunction.NORMAL}
      />
      <BrightnessContrast
        brightness={0.02}
        contrast={0.22}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette
        offset={0.35}
        darkness={0.4}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
