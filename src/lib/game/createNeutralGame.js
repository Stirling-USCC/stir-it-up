import { Action } from '../engine/Action.js';
import { Board } from '../engine/Board.svelte.js';
import { Die } from '../engine/Die.svelte.js';
import { Game } from '../engine/Game.svelte.js';
import { Square } from '../engine/Square.svelte.js';

// Stable, content-free game used by engine tests and the interactive showcase.
// Visitor contributions belong in createGame.js so they cannot make these fixtures unpredictable.
export function createDefaultSquares() {
  return Array.from({ length: 100 }, (_, position) => new Square({
    id: `square-${position + 1}`,
    name: `Square ${position + 1}`,
    position,
    coordinates: {
      x: position % 10,
      y: Math.floor(position / 10)
    }
  }));
}

export function createNeutralGame({ squares = createDefaultSquares(), decks = [], dice = [], rules = [], actions: extraActions = [] } = {}) {

  const actions = [
    new Action({
      id: 'roll', label: 'Roll', icon: 'bi-dice-6', variant: 'primary', emphasis: 'primary',
      available: (game, player) => game.status === 'playing' && !!player && game.turn.phase === 'roll',
      perform: async (game) => {
        const roll = await game.rollDice();
        if (roll) await game.changePhase('move');
      }
    }),
    new Action({
      id: 'move', label: 'Move', icon: 'bi-arrow-right-circle', variant: 'primary', emphasis: 'primary',
      available: (game, player) => game.status === 'playing' && !!player && game.turn.phase === 'move' && game.lastRoll?.playerId === player.id,
      perform: async (game, player) => {
        await player.move(game.lastRoll.total);
        await game.changePhase('action');
      }
    }),
    new Action({
      id: 'end-turn', label: 'End turn', icon: 'bi-skip-end-fill', variant: 'secondary',
      available: (game, player) => game.status === 'playing' && !!player && game.turn.phase === 'action',
      perform: (game) => game.endTurn()
    })
  ];

  return new Game({
    board: new Board(squares),
    decks,
    dice: [new Die({ id: 'demo-d6', name: 'Movement die', sides: 6, colour: '#fdf1da' }), ...dice],
    rules,
    actions: [...actions, ...extraActions]
  });
}
