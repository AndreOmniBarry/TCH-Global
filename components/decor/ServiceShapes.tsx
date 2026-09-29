'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { Pill, DottedGrid, CrystalShard, MeshOrb } from './Shapes';

export default function ServiceShapes() {
  return (
    <ShapeLayer targetId="service-shapes">
      <FloatingShape top="-10%" right="-10%" depth={1.3} rotate={0}>
        <MeshOrb size={300} color="var(--accent-violet)" style={{ opacity: 0.45 }} />
      </FloatingShape>
      <FloatingShape top="2%" right="-4%" depth={1} rotate={-10}>
        <CrystalShard size={150} color="var(--accent-violet)" style={{ opacity: 0.8 }} />
      </FloatingShape>
      <FloatingShape bottom="10%" left="0%" depth={0.7} rotate={8}>
        <Pill width={120} height={44} color="var(--accent-gold)" style={{ opacity: 0.5 }} />
      </FloatingShape>
      <FloatingShape top="60%" right="14%" depth={0.55} rotate={-4}>
        <DottedGrid size={110} color="var(--accent-cyan)" style={{ opacity: 0.6 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
