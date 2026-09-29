'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { Polygon, DottedGrid, Pill, MeshOrb } from './Shapes';

export default function VolunteerShapes() {
  return (
    <ShapeLayer targetId="volunteer-shapes">
      <FloatingShape top="-10%" right="-6%" depth={1.2} rotate={0}>
        <MeshOrb size={280} color="var(--accent-gold)" style={{ opacity: 0.4 }} />
      </FloatingShape>
      <FloatingShape top="-4%" right="10%" depth={1} rotate={12}>
        <Polygon size={130} color="var(--accent-gold)" filled style={{ opacity: 0.5 }} />
      </FloatingShape>
      <FloatingShape bottom="8%" left="4%" depth={0.6} rotate={-6}>
        <DottedGrid size={100} color="var(--accent-violet)" style={{ opacity: 0.6 }} />
      </FloatingShape>
      <FloatingShape top="45%" left="45%" depth={0.4} rotate={0}>
        <Pill width={90} height={32} color="var(--accent-cyan)" style={{ opacity: 0.4 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
