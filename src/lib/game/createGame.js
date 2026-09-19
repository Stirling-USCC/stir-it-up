import { createNeutralGame } from './createNeutralGame.js';

// The real game's composition root. Add visitor content here or import it from
// a plainly named module in ./content as the collection grows.
export function createGame() {
  const game = createNeutralGame();

  return game;
}
