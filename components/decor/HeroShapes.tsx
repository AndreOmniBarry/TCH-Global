'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { HollowRing, Pill, DottedGrid, FluidBlob, Polygon } from './Shapes';

export default function HeroShapes() {
  return (
    <ShapeLayer targetId="hero-shapes">
      <FloatingShape top="-6%" right="-4%" depth={1.4} rotate={14}>
        <FluidBlob size={340} color="var(--accent-cyan)" style={{ opacity: 0.55 }} />
      </FloatingShape>
      <FloatingShape top="10%" right="10%" depth={1.6} rotate={18}>
        <HollowRing size={190} color="var(--accent-lavender)" strokeWidth={18} style={{ opacity: 0.85 }} />
      </FloatingShape>
      <FloatingShape top="58%" right="4%" depth={0.9} rotate={-10}>
        <DottedGrid size={150} color="var(--accent-violet)" style={{ opacity: 0.8 }} />
      </FloatingShape>
      <FloatingShape top="8%" left="3%" depth={1.1} rotate={-8}>
        <Pill width={170} height={62} color="var(--accent-gold)" style={{ opacity: 0.65 }} />
      </FloatingShape>
      <FloatingShape bottom="10%" left="6%" depth={0.8} rotate={12}>
        <Polygon size={130} color="var(--accent-cyan)" filled style={{ opacity: 0.6 }} />
      </FloatingShape>
      <FloatingShape bottom="4%" left="30%" depth={0.5} rotate={0}>
        <HollowRing size={80} color="var(--accent-gold)" strokeWidth={12} style={{ opacity: 0.7 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
