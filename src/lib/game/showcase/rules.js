import { Rule } from '../../engine/Rule.js';

export function createShowcaseRules() {
  const observer = new Rule({
    id: 'observer', name: 'Clockwork Observer', description: 'Counts rolls, played cards, and deck changes.',
    stats: { curious: true }, handlers: {
      'dice:rolled': async (game) => {
        await observer.incrementStat('rollsObserved');
        await game.logEvent('Clockwork Observer counted a roll.', 'rule');
      },
      'card:played': async (game) => {
        await observer.incrementStat('cardsObserved');
        await game.logEvent('Clockwork Observer counted a played card.', 'rule');
      },
      'deck:reset': async (game) => {
        await observer.incrementStat('deckResets');
        await game.logEvent('Clockwork Observer saw a deck reset.', 'rule');
      },
      'deck:shuffled': async (game) => {
        await observer.incrementStat('shuffles');
        await game.logEvent('Clockwork Observer saw a shuffle.', 'rule');
      }
    }
  });
  const effectsRule = new Rule({
    id: 'effects-rule', name: 'Attachment Observer', description: 'Observes items and effects being added or removed.', handlers: {
      'player:effect-added': async (game, { player, effect }) => {
        await player.incrementStat('effectChanges');
        await game.logEvent(`${effect.name} took effect on ${player.name}.`, 'rule');
      },
      'player:effect-removed': async (game, { player, effect }) => {
        await player.incrementStat('effectChanges');
        await game.logEvent(`${effect.name} stopped affecting ${player.name}.`, 'rule');
      },
      'player:item-added': (game, { player, item }) => game.logEvent(`${item.name} is available to ${player.name}.`, 'rule'),
      'player:item-removed': (game, { player, item }) => game.logEvent(`${item.name} no longer helps ${player.name}.`, 'rule')
    }
  });
  return { observer, rules: [observer, effectsRule] };
}
