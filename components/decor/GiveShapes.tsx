'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { CrystalShard, FluidBlob, DottedGrid, MeshOrb } from './Shapes';

export default function GiveShapes() {
  return (
    <ShapeLayer targetId="give-shapes">
      <FloatingShape top="-12%" right="-8%" depth={1.2} rotate={0}>
        <MeshOrb size={300} color="var(--accent-gold)" style={{ opacity: 0.45 }} />
      </FloatingShape>
      <FloatingShape top="-8%" right="-4%" depth={1.1} rotate={14}>
        <FluidBlob size={260} color="var(--accent-gold)" style={{ opacity: 0.45 }} />
      </FloatingShape>
      <FloatingShape bottom="6%" left="2%" depth={0.7} rotate={-10}>
        <CrystalShard size={130} color="var(--accent-lavender)" style={{ opacity: 0.75 }} />
      </FloatingShape>
      <FloatingShape top="55%" left="50%" depth={0.5} rotate={0}>
        <DottedGrid size={90} color="var(--accent-cyan)" style={{ opacity: 0.5 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
