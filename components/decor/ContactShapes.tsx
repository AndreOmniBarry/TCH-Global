'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { HollowRing, FluidBlob } from './Shapes';

export default function ContactShapes() {
  return (
    <ShapeLayer targetId="contact-shapes">
      <FloatingShape top="-6%" right="-4%" depth={1} rotate={10}>
        <FluidBlob size={240} color="var(--accent-cyan)" style={{ opacity: 0.4 }} />
      </FloatingShape>
      <FloatingShape bottom="6%" left="6%" depth={0.7} rotate={-8}>
        <HollowRing size={130} color="var(--accent-gold)" strokeWidth={13} style={{ opacity: 0.55 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
