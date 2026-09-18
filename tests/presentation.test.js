import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { Action } from '../src/lib/engine/Action.js';
import { Effect } from '../src/lib/engine/Effect.js';
import { InventoryItem } from '../src/lib/engine/InventoryItem.js';
import { Player } from '../src/lib/engine/Player.svelte.js';
import { actionClasses } from '../src/lib/components/actionPresentation.js';
import DetailTabs from '../src/lib/components/DetailTabs.svelte';
import PlayerCard from '../src/lib/components/PlayerCard.svelte';
import { createGame } from '../src/lib/game/createGame.js';

describe('action presentation', () => {
  it('maps action metadata to Bootstrap buttons without accepting raw classes', () => {
    expect(actionClasses(new Action({ id: 'roll', label: 'Roll', variant: 'primary', emphasis: 'primary' })))
      .toBe('btn btn-primary btn-lg');
    expect(actionClasses(new Action({ id: 'remove', label: 'Remove', variant: 'danger' })))
      .toBe('btn btn-danger');
    expect(actionClasses(new Action({ id: 'other', label: 'Other', variant: 'btn-danger extra' })))
      .toBe('btn btn-outline-primary');
  });
});

describe('compact player details and tabs', () => {
  const game = createGame();
  const player = new Player({
    id: 'test-player', name: 'Recursive Potato', number: 1,
    stats: { cabbages: 17 },
    inventory: [new InventoryItem({ id: 'spoon', name: 'Silver Spoon', stats: { polish: 8 } })],
    effects: [new Effect({ id: 'sparkly', name: 'Sparkly', description: 'Glitters briefly.', duration: 3 })]
  });
  game.players.push(player);

  it('keeps effects and generic stats in the player panel, with only an inventory count', () => {
    const html = render(PlayerCard, { props: { player } }).body;
    expect(html).toContain('Sparkly');
    expect(html).toContain('Glitters briefly.');
    expect(html).toContain('cabbages');
    expect(html).toContain('17');
    expect(html).toContain('Inventory');
    expect(html).not.toContain('Silver Spoon');
  });

  it('renders the selected player’s inventory in the lower panel', () => {
    const html = render(DetailTabs, { props: { game, selectedPlayerId: player.id, activeTab: 'inventory', onselecttab: () => {} } }).body;
    expect(html).toContain("Recursive Potato's Inventory");
    expect(html).toContain('Silver Spoon');
    expect(html).toContain('polish');
    expect(html).toContain('Decks');
    expect(html).toContain('Event Log');
    expect(render(DetailTabs, { props: { game, selectedPlayerId: null, activeTab: 'inventory', onselecttab: () => {} } }).body)
      .toContain('Select a player to view their inventory.');
  });
});
