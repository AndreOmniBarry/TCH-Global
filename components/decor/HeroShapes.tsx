'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { HollowRing, Pill, DottedGrid } from './Shapes';

export default function HeroShapes() {
  return (
    <ShapeLayer targetId="hero-shapes">
      <FloatingShape top="8%" right="6%" depth={1.3} rotate={12}>
        <HollowRing size={130} color="var(--accent-cyan)" strokeWidth={8} style={{ opacity: 0.5 }} />
      </FloatingShape>
      <FloatingShape top="62%" right="10%" depth={0.7} rotate={-8}>
        <DottedGrid size={110} color="var(--accent-violet)" style={{ opacity: 0.6 }} />
      </FloatingShape>
      <FloatingShape top="14%" left="5%" depth={0.9} rotate={-6}>
        <Pill width={120} height={44} color="var(--accent-gold)" style={{ opacity: 0.4 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
