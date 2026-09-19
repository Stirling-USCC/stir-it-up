// Navigation follows board-space coordinates, independently of square order or CSS layout.
export function activeSquareId(squares, focusedId) {
  return squares.some((square) => square.id === focusedId) ? focusedId : squares[0]?.id ?? null;
}

export function findSquareInDirection(squares, currentSquare, direction) {
  if (!currentSquare) return null;
  const length = Math.hypot(direction.x, direction.y);
  if (!length) return null;
  let best = null;
  let bestScore = Infinity;
  for (const square of squares) {
    if (square === currentSquare) continue;
    const dx = square.coordinates.x - currentSquare.coordinates.x;
    const dy = square.coordinates.y - currentSquare.coordinates.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) continue;
    const alignment = (dx * direction.x + dy * direction.y) / (distance * length);
    if (alignment < 0.5) continue;
    const score = distance / (alignment * alignment);
    if (score < bestScore || (score === bestScore && square.position < best.position)) {
      best = square;
      bestScore = score;
    }
  }
  return best;
}
