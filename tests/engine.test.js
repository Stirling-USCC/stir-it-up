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
    const player = game.players[0];
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
      ['player-1', 'cabbages', 12],
      ['player-1', 'cabbages', 15],
      ['player-1', 'cabbages', 13],
      ['square-1', 'descriptionCode', 'neutral'],
      ['player-1', 'cabbages', undefined]
    ]);
    await expect(square.incrementStat('descriptionCode')).rejects.toThrow('not a finite number');
  });

  it('moves through the board in either direction using the player command', async () => {
    const game = createGame();
    const player = game.players[0];
    const moves = [];
    game.events.on('player:moved', ({ from, to }) => moves.push([from, to]));
    await player.move(-1);
    expect(player.position).toBe(15);
    await player.move(3);
    expect(player.position).toBe(2);
    await player.moveTo(17);
    expect(player.position).toBe(1);
    expect(moves).toEqual([[0, 15], [15, 2], [2, 1]]);
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
    const phases = [];
    game.events.on('turn:phase-changed', ({ phase }) => phases.push(phase));
    game.dice.roll = () => ({ rolls: [4], modifier: 0, total: 4 });
    await game.startGame();
    expect(game.getCurrentPlayer().id).toBe('player-1');
    expect(game.turn.number).toBe(1);
    await game.actions.find((action) => action.id === 'roll').perform(game);
    await game.actions.find((action) => action.id === 'move').perform(game, game.getCurrentPlayer());
    expect(game.players[0].position).toBe(4);
    await game.endTurn();
    expect(game.getCurrentPlayer().id).toBe('player-2');
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

  it('keeps the turn coherent when the current player leaves or becomes inactive', async () => {
    const game = createGame();
    await game.addPlayer(new Player({ id: 'player-3', name: 'Player Three' }));
    await game.startGame();
    await game.endTurn();
    expect(game.getCurrentPlayer().id).toBe('player-2');
    await game.removePlayer('player-2');
    expect(game.getCurrentPlayer().id).toBe('player-3');
    expect(game.turn.number).toBe(3);
    expect(game.turn.phase).toBe('roll');
    await game.getCurrentPlayer().setActive(false);
    expect(game.getCurrentPlayer().id).toBe('player-1');
    expect(game.turn.number).toBe(4);
    await game.getCurrentPlayer().setActive(false);
    expect(game.status).toBe('finished');
    expect(game.getCurrentPlayer()).toBe(null);
  });

  it('keeps positions and square stats aligned when the board changes', async () => {
    const game = createGame();
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
    const player = game.players[0];
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
