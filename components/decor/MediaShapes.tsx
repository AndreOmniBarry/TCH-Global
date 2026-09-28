'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { FluidBlob, HollowRing } from './Shapes';

export default function MediaShapes() {
  return (
    <ShapeLayer targetId="media-shapes">
      <FloatingShape top="-10%" left="-6%" depth={1.1} rotate={-14}>
        <FluidBlob size={280} color="var(--accent-lavender)" style={{ opacity: 0.42 }} />
      </FloatingShape>
      <FloatingShape bottom="4%" right="6%" depth={0.8} rotate={10}>
        <HollowRing size={140} color="var(--accent-cyan)" strokeWidth={14} style={{ opacity: 0.6 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
