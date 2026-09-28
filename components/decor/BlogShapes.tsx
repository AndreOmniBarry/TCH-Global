'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { FluidBlob, Polygon, HollowRing } from './Shapes';

export default function BlogShapes() {
  return (
    <ShapeLayer targetId="blog-shapes">
      <FloatingShape top="-8%" right="-6%" depth={1.1} rotate={12}>
        <FluidBlob size={260} color="var(--accent-cyan)" style={{ opacity: 0.4 }} />
      </FloatingShape>
      <FloatingShape bottom="0%" left="2%" depth={0.7} rotate={-8}>
        <Polygon size={100} color="var(--accent-violet)" style={{ opacity: 0.55 }} />
      </FloatingShape>
      <FloatingShape top="35%" right="10%" depth={0.5} rotate={6}>
        <HollowRing size={90} color="var(--accent-gold)" strokeWidth={12} style={{ opacity: 0.55 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
