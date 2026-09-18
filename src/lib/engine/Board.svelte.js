export class Board {
  squares = $state([]);

  constructor(squares = []) {
    this.squares = [...squares];
    this.squares.forEach((square, index) => { square.position = index; });
  }

  getSquare(position) {
    return this.squares[this.resolvePosition(position)];
  }

  getSquareById(id) {
    return this.squares.find((square) => square.id === id);
  }

  resolvePosition(position) {
    if (this.squares.length === 0) throw new Error('Cannot move on an empty board');
    if (!Number.isInteger(position)) throw new TypeError('Position must be an integer');
    let resolved = position;
    while (resolved < 0) resolved += this.squares.length;
    while (resolved >= this.squares.length) resolved -= this.squares.length;
    return resolved;
  }

  getPath(from, steps) {
    if (!Number.isInteger(steps)) throw new TypeError('Movement must use whole squares');
    const path = [];
    const direction = Math.sign(steps);
    for (let step = 1; step <= Math.abs(steps); step += 1) {
      path.push(this.getSquare(from + step * direction));
    }
    return path;
  }
}
