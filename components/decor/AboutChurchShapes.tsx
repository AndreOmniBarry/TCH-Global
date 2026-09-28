'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { HollowRing, Polygon, Pill } from './Shapes';

export default function AboutChurchShapes() {
  return (
    <ShapeLayer targetId="about-shapes">
      <FloatingShape top="4%" right="8%" depth={1.1} rotate={10}>
        <HollowRing size={160} color="var(--accent-lavender)" strokeWidth={9} style={{ opacity: 0.4 }} />
      </FloatingShape>
      <FloatingShape bottom="8%" left="4%" depth={0.8} rotate={-10}>
        <Polygon size={90} color="var(--accent-gold)" style={{ opacity: 0.45 }} />
      </FloatingShape>
      <FloatingShape top="46%" left="2%" depth={0.5} rotate={4}>
        <Pill width={90} height={34} color="var(--accent-cyan)" style={{ opacity: 0.35 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
