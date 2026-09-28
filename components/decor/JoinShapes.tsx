'use client';

import ShapeLayer from './ShapeLayer';
import FloatingShape from './FloatingShape';
import { Pill, Polygon } from './Shapes';

export default function JoinShapes() {
  return (
    <ShapeLayer targetId="join-shapes">
      <FloatingShape top="0%" left="-4%" depth={0.9} rotate={-10}>
        <Pill width={150} height={54} color="var(--accent-violet)" style={{ opacity: 0.5 }} />
      </FloatingShape>
      <FloatingShape bottom="4%" right="8%" depth={0.7} rotate={12}>
        <Polygon size={110} color="var(--accent-cyan)" filled style={{ opacity: 0.5 }} />
      </FloatingShape>
    </ShapeLayer>
  );
}
