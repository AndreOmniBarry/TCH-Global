'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { FluidBlob, CrystalShard, MeshOrb } from './Shapes';

export default function MediaShapes() {
  return (
    <ShapeLayer targetId="media-shapes">
      <FloatingShape top="-14%" left="-10%" depth={1.3} rotate={0}>
        <MeshOrb size={320} color="var(--accent-lavender)" style={{ opacity: 0.45 }} />
      </FloatingShape>
      <FloatingShape top="-10%" left="-6%" depth={1.1} rotate={-14}>
        <FluidBlob size={280} color="var(--accent-lavender)" style={{ opacity: 0.42 }} />
      </FloatingShape>
      <FloatingShape bottom="4%" right="6%" depth={0.8} rotate={10}>
        <CrystalShard size={140} color="var(--accent-cyan)" style={{ opacity: 0.8 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
