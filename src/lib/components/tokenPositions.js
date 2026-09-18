export function tokenPositions(count) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0.5, y: 0.5 }];
  if (count === 2) return [{ x: 0.35, y: 0.5 }, { x: 0.65, y: 0.5 }];
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return { x: 0.5 + Math.cos(angle) * 0.28, y: 0.5 + Math.sin(angle) * 0.28 };
  });
}
