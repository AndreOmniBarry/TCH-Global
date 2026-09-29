'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { FluidBlob, Polygon, CrystalShard, MeshOrb } from './Shapes';

export default function BlogShapes() {
  return (
    <ShapeLayer targetId="blog-shapes">
      <FloatingShape top="-14%" right="-10%" depth={1.3} rotate={0}>
        <MeshOrb size={300} color="var(--accent-cyan)" style={{ opacity: 0.45 }} />
      </FloatingShape>
      <FloatingShape top="-8%" right="-6%" depth={1.1} rotate={12}>
        <FluidBlob size={260} color="var(--accent-cyan)" style={{ opacity: 0.4 }} />
      </FloatingShape>
      <FloatingShape bottom="0%" left="2%" depth={0.7} rotate={-8}>
        <Polygon size={100} color="var(--accent-violet)" style={{ opacity: 0.55 }} />
      </FloatingShape>
      <FloatingShape top="35%" right="10%" depth={0.5} rotate={6}>
        <CrystalShard size={110} color="var(--accent-gold)" style={{ opacity: 0.75 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
