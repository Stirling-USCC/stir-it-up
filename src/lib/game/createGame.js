import { Action } from '../engine/Action.js';
import { Board } from '../engine/Board.svelte.js';
import { Deck } from '../engine/Deck.svelte.js';
import { Dice } from '../engine/Dice.svelte.js';
import { Game } from '../engine/Game.svelte.js';
import { Player } from '../engine/Player.svelte.js';
import { Square } from '../engine/Square.svelte.js';

// Placeholder content lives here. Engine classes never know this demo's square count or turn actions.
export function createGame() {
  const squares = Array.from({ length: 16 }, (_, position) => new Square({
    id: `square-${position + 1}`,
    name: `Square ${position + 1}`,
    position,
    icon: '·'
  }));

  const game = new Game({
    board: new Board(squares),
    players: [
      new Player({ id: 'player-1', name: 'Player One', icon: '●', className: 'bg-primary' }),
      new Player({ id: 'player-2', name: 'Player Two', icon: '◆', className: 'bg-success' })
    ],
    decks: [new Deck({ id: 'deck-1', name: 'Deck 1' })],
    dice: new Dice({ id: 'demo-d6', name: 'One six-sided die' })
  });

  // These actions demonstrate the engine. Replace them when actual rules are designed.
  game.actions = [
    new Action({
      id: 'start', label: 'Start game', icon: 'bi-play-fill',
      available: (game) => game.status === 'waiting',
      perform: (game) => game.startGame()
    }),
    new Action({
      id: 'roll', label: 'Roll dice', icon: 'bi-dice-6',
      available: (game, player) => game.status === 'playing' && !!player && game.turn.phase === 'roll',
      perform: async (game) => {
        await game.rollDice();
        await game.changePhase('move');
      }
    }),
    new Action({
      id: 'move', label: 'Move by roll', icon: 'bi-arrow-right-circle',
      available: (game, player) => game.status === 'playing' && !!player && game.turn.phase === 'move' && game.lastRoll?.playerId === player.id,
      perform: async (game, player) => {
        await player.move(game.lastRoll.total);
        await game.changePhase('action');
      }
    }),
    new Action({
      id: 'end-turn', label: 'End turn', icon: 'bi-skip-end-fill',
      available: (game, player) => game.status === 'playing' && !!player && game.turn.phase === 'action',
      perform: (game) => game.endTurn()
    })
  ];
  for (const action of game.actions) game.attach(action);

  return game;
}
