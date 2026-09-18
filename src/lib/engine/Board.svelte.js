export class Board {
  squares = $state([]);

  constructor(squares = []) {
    this.squares = [...squares];
    this.reindexSquares();
  }

  reindexSquares() {
    this.squares.forEach((square, index) => { square.position = index; });
  }

  async addSquare(square, index = this.squares.length) {
    if (square?.id == null) throw new Error('A square needs an ID');
    if (!Number.isInteger(index) || index < 0 || index > this.squares.length) {
      throw new RangeError('Square index is outside the board');
    }
    if (this.getSquareById(square.id)) throw new Error(`Square ID already exists: ${square.id}`);
    const wasEmpty = this.squares.length === 0;
    this.squares.splice(index, 0, square);
    this.reindexSquares();
    if (this.game) {
      this.game.attach(square);
      const positionChanges = [];
      for (const player of this.game.players) {
        let change = null;
        if (wasEmpty) change = player.updatePositionAfterBoardChange(0);
        else if (player.position >= index) change = player.updatePositionAfterBoardChange(player.position + 1);
        if (change) positionChanges.push(change);
      }
      await this.game.events.emit('board:square-added', { board: this, square, index });
      for (const change of positionChanges) await this.game.events.emit('player:position-rebased', change);
      await this.game.logEvent(`${square.name} was added to the board.`, 'board');
    }
    return square;
  }

  async removeSquare(squareOrId) {
    const id = typeof squareOrId === 'string' ? squareOrId : squareOrId.id;
    const index = this.squares.findIndex((square) => square.id === id);
    if (index < 0) return null;
    if (this.squares.length === 1 && this.game?.players.length) {
      throw new Error('Cannot remove the last square while players are on the board');
    }
    const [square] = this.squares.splice(index, 1);
    this.reindexSquares();
    if (this.game) {
      square.game = null;
      const positionChanges = [];
      for (const player of this.game.players) {
        let position = player.position;
        if (position > index) position -= 1;
        if (position >= this.squares.length) position = this.squares.length - 1;
        const change = player.updatePositionAfterBoardChange(position);
        if (change) positionChanges.push(change);
      }
      await this.game.events.emit('board:square-removed', { board: this, square, index });
      for (const change of positionChanges) await this.game.events.emit('player:position-rebased', change);
      await this.game.logEvent(`${square.name} was removed from the board.`, 'board');
    }
    return square;
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
