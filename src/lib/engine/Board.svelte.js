import { assertId, assertUniqueIds } from './ids.js';

export class Board {
  squares = $state([]);

  constructor(squares = []) {
    assertUniqueIds(squares, 'square');
    this.squares = [...squares];
    this.reindexSquares();
  }

  reindexSquares() {
    this.squares.forEach((square, index) => { square.position = index; });
  }

  async addSquare(square, index = this.squares.length) {
    const addition = await this.game?.events.emitCancellable('board:square-adding', { board: this, square, index }) ?? { square, index };
    if (addition.cancelled) return null;
    square = addition.square;
    index = addition.index;
    assertId(square, 'square');
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
    const removal = await this.game?.events.emitCancellable('board:square-removing', { board: this, square: this.squares[index], index }) ?? { square: this.squares[index] };
    if (removal.cancelled) return null;
    const removalIndex = this.squares.indexOf(removal.square);
    if (removalIndex < 0) throw new Error('Square to remove is not on this board');
    if (this.squares.length === 1 && this.game?.players.length) {
      throw new Error('Cannot remove the last square while players are on the board');
    }
    const [square] = this.squares.splice(removalIndex, 1);
    this.reindexSquares();
    if (this.game) {
      square.game = null;
      const positionChanges = [];
      for (const player of this.game.players) {
        let position = player.position;
        if (position > removalIndex) position -= 1;
        if (position >= this.squares.length) position = this.squares.length - 1;
        const change = player.updatePositionAfterBoardChange(position);
        if (change) positionChanges.push(change);
      }
      await this.game.events.emit('board:square-removed', { board: this, square, index: removalIndex });
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
