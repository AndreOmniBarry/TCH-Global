'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { CrystalShard, Polygon, Pill, FluidBlob, DottedGrid, MeshOrb } from './Shapes';

export default function AboutChurchShapes() {
  return (
    <ShapeLayer targetId="about-shapes">
      <FloatingShape top="-14%" right="-10%" depth={1.3} rotate={0}>
        <MeshOrb size={360} color="var(--accent-lavender)" style={{ opacity: 0.5, filter: 'blur(6px)' }} />
      </FloatingShape>
      <FloatingShape top="-8%" right="-6%" depth={1.2} rotate={12}>
        <FluidBlob size={300} color="var(--accent-lavender)" style={{ opacity: 0.5 }} />
      </FloatingShape>
      <FloatingShape top="6%" right="14%" depth={1.4} rotate={16}>
        <CrystalShard size={180} color="var(--accent-cyan)" style={{ opacity: 0.85 }} />
      </FloatingShape>
      <FloatingShape bottom="4%" left="2%" depth={0.9} rotate={-12}>
        <Polygon size={140} color="var(--accent-gold)" filled style={{ opacity: 0.55 }} />
      </FloatingShape>
      <FloatingShape top="40%" left="-2%" depth={0.6} rotate={4}>
        <Pill width={130} height={48} color="var(--accent-cyan)" style={{ opacity: 0.6 }} />
      </FloatingShape>
      <FloatingShape bottom="14%" right="6%" depth={0.7} rotate={-6}>
        <DottedGrid size={120} color="var(--accent-violet)" style={{ opacity: 0.7 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
