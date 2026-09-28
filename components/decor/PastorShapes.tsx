'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { HollowRing, Pill, DottedGrid } from './Shapes';

export default function PastorShapes() {
  return (
    <ShapeLayer targetId="pastor-shapes">
      <FloatingShape top="-6%" left="-4%" depth={1.1} rotate={-12}>
        <HollowRing size={180} color="var(--accent-gold)" strokeWidth={16} style={{ opacity: 0.6 }} />
      </FloatingShape>
      <FloatingShape bottom="4%" right="8%" depth={0.8} rotate={10}>
        <DottedGrid size={120} color="var(--accent-cyan)" style={{ opacity: 0.6 }} />
      </FloatingShape>
      <FloatingShape top="50%" left="40%" depth={0.5} rotate={0}>
        <Pill width={100} height={36} color="var(--accent-lavender)" style={{ opacity: 0.4 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
