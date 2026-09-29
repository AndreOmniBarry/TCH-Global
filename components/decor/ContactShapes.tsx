'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { CrystalShard, FluidBlob, MeshOrb } from './Shapes';

export default function ContactShapes() {
  return (
    <ShapeLayer targetId="contact-shapes">
      <FloatingShape top="-12%" right="-8%" depth={1.2} rotate={0}>
        <MeshOrb size={280} color="var(--accent-cyan)" style={{ opacity: 0.42, filter: 'blur(6px)' }} />
      </FloatingShape>
      <FloatingShape top="-6%" right="-4%" depth={1} rotate={10}>
        <FluidBlob size={240} color="var(--accent-cyan)" style={{ opacity: 0.4 }} />
      </FloatingShape>
      <FloatingShape bottom="6%" left="6%" depth={0.7} rotate={-8}>
        <CrystalShard size={130} color="var(--accent-gold)" style={{ opacity: 0.75 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
