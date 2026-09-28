'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { HollowRing, FluidBlob, DottedGrid } from './Shapes';

export default function GiveShapes() {
  return (
    <ShapeLayer targetId="give-shapes">
      <FloatingShape top="-8%" right="-4%" depth={1.1} rotate={14}>
        <FluidBlob size={260} color="var(--accent-gold)" style={{ opacity: 0.45 }} />
      </FloatingShape>
      <FloatingShape bottom="6%" left="2%" depth={0.7} rotate={-10}>
        <HollowRing size={130} color="var(--accent-lavender)" strokeWidth={14} style={{ opacity: 0.55 }} />
      </FloatingShape>
      <FloatingShape top="55%" left="50%" depth={0.5} rotate={0}>
        <DottedGrid size={90} color="var(--accent-cyan)" style={{ opacity: 0.5 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
