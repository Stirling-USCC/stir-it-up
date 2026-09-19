import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/lib/engine/EventBus.js';
import { Card } from '../src/lib/engine/Card.svelte.js';
import { Square } from '../src/lib/engine/Square.svelte.js';
import { Deck } from '../src/lib/engine/Deck.svelte.js';
import { Player } from '../src/lib/engine/Player.svelte.js';
import { Game } from '../src/lib/engine/Game.svelte.js';
import { Board } from '../src/lib/engine/Board.svelte.js';
import { InventoryItem } from '../src/lib/engine/InventoryItem.js';
import { Effect } from '../src/lib/engine/Effect.js';
import { createGame } from '../src/lib/game/createGame.js';
import { Die } from '../src/lib/engine/Die.svelte.js';
import { findSquareInDirection } from '../src/lib/components/boardNavigation.js';
import { tokenPositions } from '../src/lib/components/tokenPositions.js';

describe('EventBus', () => {
  it('awaits listeners in order and handles once/unsubscribe', async () => {
    const bus = new EventBus();
    const calls = [];
    const unsubscribe = bus.on('step', async () => {
      calls.push('first begins');
      await Promise.resolve();
      calls.push('first ends');
    });
    bus.once('step', () => calls.push('once'));
    bus.on('step', () => calls.push('last'));
    await bus.emit('step');
    unsubscribe();
    await bus.emit('step');
    expect(calls).toEqual(['first begins', 'first ends', 'once', 'last', 'last']);
  });

  it('does not call a listener removed by an earlier listener', async () => {
    const bus = new EventBus();
    const calls = [];
    bus.on('step', () => {
      calls.push('first');
      unsubscribe();
    });
    const unsubscribe = bus.on('step', () => calls.push('removed'));
    await bus.emit('step');
    expect(calls).toEqual(['first']);
  });
});

describe('generic engine objects', () => {
  it('changes arbitrary stats on players and squares and emits events', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const square = game.board.squares[0];
    const changes = [];
    game.events.on('object:stat-changed', ({ object, name, value }) => changes.push([object.id, name, value]));
    await player.setStat('cabbages', 12);
    await player.incrementStat('cabbages', 3);
    await player.decrementStat('cabbages', 2);
    await square.addStat('descriptionCode', 'neutral');
    expect(player.getStat('cabbages')).toBe(13);
    expect(square.getStat('descriptionCode')).toBe('neutral');
    await player.removeStat('cabbages');
    expect(player.hasStat('cabbages')).toBe(false);
    expect(changes).toEqual([
      [player.id, 'cabbages', 12],
      [player.id, 'cabbages', 15],
      [player.id, 'cabbages', 13],
      ['square-1', 'descriptionCode', 'neutral'],
      [player.id, 'cabbages', undefined]
    ]);
    await expect(square.incrementStat('descriptionCode')).rejects.toThrow('not a finite number');
  });

  it('moves through the board in either direction using the player command', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const moves = [];
    game.events.on('player:moved', ({ from, to }) => moves.push([from, to]));
    await player.move(-1);
    expect(player.position).toBe(99);
    await player.move(3);
    expect(player.position).toBe(2);
    await player.moveTo(17);
    expect(player.position).toBe(17);
    expect(moves).toEqual([[0, 99], [99, 2], [2, 17]]);
  });

  it('draws and discards cards without assuming card content', async () => {
    const card = new Card({ id: 'blank', name: 'Blank' });
    const deck = new Deck({ id: 'deck', name: 'Deck', cards: [card] });
    await expect(deck.discard(card)).rejects.toThrow('must be drawn');
    const drawn = await deck.draw();
    expect(drawn).toBe(card);
    expect(deck.drawPile).toHaveLength(0);
    await deck.discard(drawn);
    expect(deck.discardPile).toEqual([card]);
    await expect(deck.discard(drawn)).rejects.toThrow('must be drawn');
    await deck.reset();
    expect(deck.drawPile).toEqual([card]);
    expect(deck.discardPile).toHaveLength(0);
  });

  it('runs the demonstration actions through two players and updates turn state', async () => {
    const game = createGame();
    const first = await game.addPlayer();
    const second = await game.addPlayer();
    const phases = [];
    game.events.on('turn:phase-changed', ({ phase }) => phases.push(phase));
    await game.startGame();
    expect(game.getCurrentPlayer().id).toBe(first.id);
    expect(game.turn.number).toBe(1);
    await game.actions.find((action) => action.id === 'roll').perform(game);
    const rolled = game.lastRoll.total;
    await game.actions.find((action) => action.id === 'move').perform(game, game.getCurrentPlayer());
    expect(first.position).toBe(rolled);
    await game.endTurn();
    expect(game.getCurrentPlayer().id).toBe(second.id);
    expect(game.turn.number).toBe(2);
    expect(game.turn.phase).toBe('roll');
    expect(phases).toContain('move');
    expect(phases).toContain('action');
    expect(game.log.some((entry) => entry.message.includes('moved from'))).toBe(true);
  });

  it('uses the configured turn phases instead of requiring a roll phase', async () => {
    const game = new Game({
      board: new Board([new Square({ id: 'space', name: 'Space' })]),
      players: [new Player({ id: 'one', name: 'One' })],
      phases: ['begin', 'choose', 'done']
    });
    await game.startGame();
    expect(game.turn.phase).toBe('choose');
    await game.endTurn();
    expect(game.turn.number).toBe(2);
    expect(game.turn.phase).toBe('choose');
  });

  it('keeps the turn coherent when the current player becomes inactive', async () => {
    const game = createGame();
    const first = await game.addPlayer();
    const second = await game.addPlayer();
    const third = await game.addPlayer();
    await game.startGame();
    await game.endTurn();
    expect(game.getCurrentPlayer().id).toBe(second.id);
    await second.setActive(false);
    expect(game.getCurrentPlayer().id).toBe(third.id);
    expect(game.turn.number).toBe(3);
    expect(game.turn.phase).toBe('roll');
    await game.getCurrentPlayer().setActive(false);
    expect(game.getCurrentPlayer().id).toBe(first.id);
    expect(game.turn.number).toBe(4);
    await game.getCurrentPlayer().setActive(false);
    expect(game.status).toBe('finished');
    expect(game.getCurrentPlayer()).toBe(null);
  });

  it('keeps positions and square stats aligned when the board changes', async () => {
    const game = createGame();
    await game.addPlayer();
    await game.addPlayer();
    const inserted = new Square({ id: 'inserted', name: 'Inserted' });
    const changes = [];
    game.events.on('player:position-rebased', ({ from, to }) => changes.push([from, to]));
    await game.board.addSquare(inserted, 0);
    expect(game.players[0].position).toBe(1);
    expect(game.board.getSquareById('square-1').position).toBe(1);
    await inserted.setStat('label', 'new');
    expect(inserted.getStat('label')).toBe('new');
    await game.board.removeSquare('inserted');
    expect(game.players[0].position).toBe(0);
    expect(game.board.getSquare(0).id).toBe('square-1');
    expect(changes).toEqual([[0, 1], [0, 1], [1, 0], [1, 0]]);
  });

  it('keeps item and effect IDs unique and emits a card play event', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    await player.addItem(new InventoryItem({ id: 'item', name: 'Item' }));
    await expect(player.addItem(new InventoryItem({ id: 'item', name: 'Duplicate' }))).rejects.toThrow('already exists');
    await player.addEffect(new Effect({ id: 'effect', name: 'Effect' }));
    await expect(player.addEffect(new Effect({ id: 'effect', name: 'Duplicate' }))).rejects.toThrow('already exists');

    const card = new Card({ id: 'card', name: 'Card' });
    const deck = new Deck({ id: 'cards', name: 'Cards', cards: [card] });
    const cardGame = new Game({ board: new Board([new Square({ id: 'card-space', name: 'Space' })]), decks: [deck] });
    const played = [];
    cardGame.events.on('card:played', ({ card }) => played.push(card.id));
    await card.play();
    expect(played).toEqual(['card']);
  });
});

describe('the default board and spatial navigation', () => {
  it('has 100 squares in a left-to-right, top-to-bottom 10 by 10 layout', () => {
    const squares = createGame().board.squares;
    expect(squares).toHaveLength(100);
    expect(squares.map((square) => square.coordinates).slice(0, 11)).toEqual([
      ...Array.from({ length: 10 }, (_, x) => ({ x, y: 0 })),
      { x: 0, y: 1 }
    ]);
    expect(squares[19].coordinates).toEqual({ x: 9, y: 1 });
    expect(squares[99].coordinates).toEqual({ x: 9, y: 9 });
    squares[37].coordinates = { x: 6.5, y: 3.25 };
    expect(squares[37].position).toBe(37);
  });

  it('navigates by coordinates on a grid and an irregular board', () => {
    const squares = createGame().board.squares;
    expect(findSquareInDirection(squares, squares[0], { x: 1, y: 0 })).toBe(squares[1]);
    expect(findSquareInDirection(squares, squares[0], { x: 0, y: 1 })).toBe(squares[10]);
    expect(findSquareInDirection(squares, squares[0], { x: -1, y: 0 })).toBe(null);
    const [origin, nearDiagonal, right, distant] = [
      { position: 0, coordinates: { x: 0, y: 0 } },
      { position: 1, coordinates: { x: 1, y: 0.8 } },
      { position: 2, coordinates: { x: 1.5, y: 0.1 } },
      { position: 3, coordinates: { x: 5, y: 0 } }
    ];
    expect(findSquareInDirection([origin, nearDiagonal, right, distant], origin, { x: 1, y: 0 })).toBe(right);
    expect(findSquareInDirection([origin, nearDiagonal], origin, { x: 0, y: 1 })).toBe(nearDiagonal);
  });
});

describe('pregame roster', () => {
  it('assigns unique IDs and numbers, reuses vacant numbers, and locks at eight', async () => {
    const game = createGame();
    const players = await Promise.all(Array.from({ length: 3 }, () => game.addPlayer()));
    expect(new Set(players.map((player) => player.id)).size).toBe(3);
    expect(players.map((player) => player.number)).toEqual([1, 2, 3]);
    expect(players.every((player) => player.name.includes(' '))).toBe(true);
    await game.removePlayer(players[1]);
    expect((await game.addPlayer()).number).toBe(2);
    while (game.players.length < 8) await game.addPlayer();
    await expect(game.addPlayer()).rejects.toThrow('at most 8');
  });

  it('allows renaming before start and rejects roster changes after start', async () => {
    const game = createGame();
    await expect(game.startGame()).rejects.toThrow('Add an active player');
    const player = await game.addPlayer();
    await player.rename('Recursive Potato');
    expect(player.name).toBe('Recursive Potato');
    await game.startGame();
    await expect(player.rename('New Name')).rejects.toThrow('before the game starts');
    await expect(game.addPlayer()).rejects.toThrow('locked');
    await expect(game.removePlayer(player)).rejects.toThrow('locked');
  });

  it('validates a roster supplied at construction', () => {
    const board = new Board([new Square({ id: 'start', name: 'Start' })]);
    const players = Array.from({ length: 9 }, (_, index) => new Player({ id: `p-${index}`, name: `Player ${index}` }));
    expect(() => new Game({ board, players })).toThrow('at most 8');
    const game = new Game({ board, players: players.slice(0, 2) });
    expect(game.players.map((player) => player.number)).toEqual([1, 2]);
    expect(game.players.every((player) => player.colour)).toBe(true);
  });
});

describe('individual dice', () => {
  it('rolls a chosen group, preserves die identity, and supports custom rolls', async () => {
    const game = createGame();
    const d4 = new Die({ id: 'four', name: 'Four', sides: 4, roll: () => 3 });
    const d20 = new Die({ id: 'twenty', name: 'Twenty', sides: 20, roll: async () => 17 });
    const roll = await game.rollDice([d4, d20]);
    expect(roll.results).toEqual([{ die: d4, value: 3 }, { die: d20, value: 17 }]);
    expect([roll.total, roll.min, roll.max]).toEqual([20, 3, 17]);
    expect(game.dice[0].sides).toBe(6);
    const defaultValue = await game.dice[0].roll();
    expect(defaultValue).toBeGreaterThanOrEqual(1);
    expect(defaultValue).toBeLessThanOrEqual(6);
    await game.addDie(d4);
    expect(game.dice.map((die) => die.id)).toEqual(['demo-d6', 'four']);
    await expect(game.addDie(d4)).rejects.toThrow('already exists');
    expect(await game.removeDie('four')).toBe(d4);
  });
});

describe('board tokens', () => {
  it('places one centrally, two apart, and three to eight within the cell deterministically', () => {
    expect(tokenPositions(1)).toEqual([{ x: 0.5, y: 0.5 }]);
    expect(tokenPositions(2)).toEqual([{ x: 0.35, y: 0.5 }, { x: 0.65, y: 0.5 }]);
    for (let count = 3; count <= 8; count += 1) {
      const positions = tokenPositions(count);
      expect(positions).toHaveLength(count);
      expect(positions).toEqual(tokenPositions(count));
      expect(positions.every(({ x, y }) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
      expect(new Set(positions.map(({ x, y }) => `${x},${y}`)).size).toBe(count);
    }
  });
});
