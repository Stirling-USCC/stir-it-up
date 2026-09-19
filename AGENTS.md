# Open day agent guide

Your job is to turn one visitor's idea into a small, working addition to **Stir it Up!**, usually in one implementation prompt and about five minutes. Make reasonable choices, keep the change local, and commit it automatically.

## Work quickly

1. Read the visitor's request and check whether the worktree already contains unrelated changes.
2. Read only the relevant engine class, `src/lib/game/createGame.js`, and one similar example. Working examples are grouped by object type under `src/lib/game/showcase/`; `createShowcaseGame.svelte.js` shows how they are assembled.
3. Implement the smallest complete and playful version of the idea. Infer minor details instead of asking questions.
4. Use your judgement about verification. Run a focused test or check when it is useful for the change; reserve broad test, check, and build runs for engine, shared UI, configuration, or other changes where they provide meaningful confidence.
5. Stage only the files you changed and commit them with a short, specific imperative message, such as `Add cabbage rain card`.

If the visitor only asks to discuss or plan an idea, do not modify files and do not create an empty commit. Once a prompt asks you to implement or change the project, always commit the finished 
change without asking for confirmation. Never amend or rewrite an earlier visitor's commit. If the worktree was already dirty, preserve those unrelated changes and keep them out of your commit.

## Where changes belong

- **Game content:** `src/lib/game/createGame.js`
- **Stable content-free fixture:** `src/lib/game/createNeutralGame.js`
- **Engine capability needed by many features:** `src/lib/engine/`
- **Rendering and browser interaction:** `src/lib/components/`
- **Shared styling:** `src/app.css`
- **Tests:** `tests/`
- **Working examples:** `src/lib/game/createShowcaseGame.svelte.js`

Add real visitor content to `createGame.js`. Do not add it to `createNeutralGame.js` or only to the showcase. When a feature contains several related objects, keep them together in a plainly named module under `src/lib/game/content/` and import it from `createGame.js`. Do not introduce automatic discovery or a plugin framework. Do not edit the engine when an existing object, hook, command, stat, or rule can express the idea. Do not add a package for something that can be written clearly in a few lines.

## Make new content reachable

When adding a game object, make sure a player can encounter, obtain, or use it through the normal game interface. Follow any method the visitor specifies. If the route is already obvious and working, use it: cards in a rendered deck can already be drawn, actions appear automatically, squares placed on the board can be reached, and configured dice and rules become active through normal play.

If an owned or conditional object has no acquisition route, add the smallest playful one as part of the same feature. For example, an otherwise unobtainable inventory item or effect can be granted by landing on or passing a related square, or by playing a related card. Choose a simple route that fits the idea and existing engine commands. Do not leave finished content stranded in source code, and do not add another acquisition mechanism when the visitor already described one.

## Engine model

- Game state says what is true now.
- Async commands such as `player.move()` change state.
- Present-tense events such as `player:moving` describe a proposed command. Rules may modify their fields or call `event.cancel(reason)`.
- Past-tense events such as `player:moved` describe a completed command.
- Event listeners run sequentially and may be async.
- Svelte components render the reactive engine objects directly.
- Use subject-owned commands instead of mutating another object's internals.
- Use plain JavaScript. Several engine files end in `.svelte.js` because their fields use Svelte 5 reactivity.

Most visible objects accept a `stats` object containing arbitrary named values. Later changes should use the async stat commands:

```js
await player.setStat('cabbages', 17);
await player.incrementStat('cabbages', 2);
await player.decrementStat('dignity');
await player.removeStat('caffeine');
```

Player, square, item, effect, deck, and card stats already render generically where those objects are displayed. Do not create a special UI field for an ordinary named value.

## Object reference

All IDs should be stable strings and unique within their collection.

| Object | Required | Useful optional fields and behaviour |
| --- | --- | --- |
| `Game` | `board` | `players`, `decks`, `dice`, `rules`, `actions`, `stats`, `phases` |
| `Board` | array of squares | `addSquare`, `removeSquare`, coordinate-independent logical order |
| `Square` | `id`, `name` | `description`, `coordinates`, `icon`, `colour`, `className`, `stats`; async `onLand`, `onLeave`, `onPass` hooks |
| `Player` | `id`, `name` | `number`, `colour`, `position`, `active`, `icon`, `className`, `stats`, `inventory`, `effects`, `hand`; normally created through the roster |
| `Die` | `id` | `name`, `sides`, `colour`, `stats`, custom `roll(context)` function |
| `DiceRoll` | created by `game.rollDice()` | preserves `{ die, value }` results; has `total`, `min`, and `max` helpers |
| `Card` | `id`, `name` | `description`, `image`, `icon`, `className`, `stats`; async `onDraw`, `onPlay`, `onDiscard` hooks |
| `Deck` | `id`, `name` | `cards`, `stats`; `addCard`, `removeCard`, `draw`, `discard`, `reset`, `shuffle` commands |
| `Action` | `id`, `label`, `perform` | `description`, `available`, `variant`, `icon`, `emphasis`, `stats`; call `run(game, player)` to execute it |
| `InventoryItem` | `id`, `name` | `description`, `metadata`, `stats`, event `handlers`; optional async `onAdd` and `onRemove` hooks |
| `Effect` | `id`, `name` | `description`, `duration`, `metadata`, `stats`, event `handlers`; optional async `onAdd` and `onRemove` hooks |
| `Rule` | `id`, `name` | `description`, `stats`, map of event `handlers` |
| `Turn` | supplied by `Game` | configurable `phases`; current number, player ID, and phase |

`position` is the square's zero-based index in the board's logical order. The UI displays `position + 1`. `coordinates: { x, y }` control spatial layout and keyboard navigation and may contain fractional values. The default board runs left-to-right and top-to-bottom.

## Copyable feature examples

Import the objects you use at the top of `createGame.js`, create them inside `createGame()`, and pass them to `createNeutralGame({ decks, dice, rules, actions, squares })`. For a special square, call `createDefaultSquares()`, replace the desired entry, and pass that array as `squares`.

The live composition should stay visibly simple:

```js
export function createGame() {
  const squares = createDefaultSquares();
  squares[36] = cabbagePatch;

  return createNeutralGame({
    squares,
    decks: [chaosDeck],
    dice: [oddDie],
    rules: [cabbageDisaster],
    actions: [shoutAction]
  });
}
```

### Square

Replace one neutral square when you want a special square at a fixed location:

```js
const cabbagePatch = new Square({
  id: 'cabbage-patch',
  name: 'Cabbage Patch',
  description: 'Gain three cabbages when you land here.',
  position: 36,
  coordinates: { x: 6, y: 3 },
  icon: '🥬',
  colour: '#bfe6c2',
  stats: { cabbages: 3 }
});

cabbagePatch.onLand = async (game, player) => {
  await player.incrementStat('cabbages', cabbagePatch.getStat('cabbages'));
  await game.logEvent(`${player.name} harvested three cabbages.`, 'square');
};

squares[36] = cabbagePatch;
```

`player.move(n)` walks a path and runs leave, pass, and land hooks. `player.moveTo(position)` jumps directly, running leave and land hooks but no pass hooks.

### Card and deck

```js
const dignityCard = new Card({
  id: 'lost-dignity',
  name: 'Lost Dignity',
  description: 'Lose two dignity.',
  icon: '🫠',
  stats: { dignity: -2 }
});

dignityCard.onPlay = async (game, player) => {
  await player.incrementStat('dignity', dignityCard.getStat('dignity'));
};

const chaosDeck = new Deck({
  id: 'chaos-deck',
  name: 'Chaos Deck',
  cards: [dignityCard],
  stats: { theme: 'bad decisions' }
});

// Pass `decks: [chaosDeck]` to createNeutralGame().
```

A deck tracks its full card list, draw pile, and discard pile. The generic Decks tab lets the current player draw; drawn cards enter `player.hand` and appear in the Cards tab with Play and Discard controls. `game.playCard(card, player)` runs `onPlay` and then discards the card. A held card must be played or discarded by its owner; represent a different affected player with a separate target in your card logic. Usually defining the card and including its deck in the game is enough.

### Die

```js
const oddDie = new Die({
  id: 'odd-die',
  name: 'Suspiciously Odd Die',
  sides: 9,
  colour: '#e9d9f1',
  stats: { temperament: 'uncooperative' },
  roll: () => [1, 3, 5, 7, 9][Math.floor(Math.random() * 5)]
});

// Pass it in `dice`, or later call `await game.addDie(oddDie)`.
```

The custom roll function may be async and receives `{ game, player }`. `await game.rollDice([dieA, dieB])` keeps each die's result instead of assuming only a total matters.

### Action

```js
const shoutAction = new Action({
  id: 'shout',
  label: 'Shout into the void',
  description: 'Gain one confidence.',
  icon: 'bi-megaphone',
  variant: 'warning',
  available: (game, player) => game.status === 'playing' && Boolean(player),
  perform: async (game, player) => {
    await player.incrementStat('confidence');
    await game.logEvent(`${player.name} shouted into the void.`, 'action');
  }
});
```

Actions render automatically and are executed through `action.run(game, player)`, which emits `action:performing` and `action:performed`. A rule or other listener can modify the proposed player or cancel the action before `perform` runs. Keep Bootstrap class construction in the UI: use a variant name such as `primary`, `warning`, or `danger`, not a raw class string. Use `emphasis: 'primary'` only for the main recommended action.

### Inventory item

```js
const springBoots = new InventoryItem({
  id: 'spring-boots',
  name: 'Spring Boots',
  description: 'Walking moves two extra squares.',
  stats: { bonus: 2 },
  handlers: {
    'player:moving': (_game, movement, owner, item) => {
      if (movement.player === owner) movement.amount += item.getStat('bonus');
    }
  }
});

await player.addItem(springBoots);
```

Items store persistent player-owned state. Their handlers are active only while the owner carries them. Each handler receives `(game, event, owner, item)`. Add and remove items with `player.addItem(item)` and `player.removeItem(id)` so subscriptions, events, and UI updates occur. One item instance belongs to one player; create another instance instead of sharing the same object.

### Effect

```js
const rooted = new Effect({
  id: 'rooted',
  name: 'Rooted',
  description: 'Cannot walk.',
  duration: 1,
  handlers: {
    'player:moving': (_game, movement, owner) => {
      if (movement.player === owner) movement.cancel('Rooted players cannot walk.');
    }
  }
});

await player.addEffect(rooted);
```

Effects describe state attached to a player. Their handler signature is `(game, event, owner, effect)`. Use `player.addEffect(effect)` and `player.removeEffect(id)` rather than editing `player.effects` directly during play. One effect instance belongs to one player. `duration` is currently descriptive; a feature that uses it should explicitly update or remove the effect.

### Rule

```js
const cabbageDisaster = new Rule({
  id: 'cabbage-disaster',
  name: 'Cabbage Disaster',
  description: 'Whenever a one is rolled, everybody loses a cabbage.',
  handlers: {
    'dice:rolled': async (game, { roll }) => {
      if (!roll.results.some(({ value }) => value === 1)) return;
      for (const player of game.players) await player.decrementStat('cabbages');
    }
  }
});

// Pass it in `rules: [cabbageDisaster]`.
```

Rules are installed when the game starts and removed when it finishes. Use them for behaviour spanning several objects or reacting globally. Keep behaviour belonging to a square, card, item, or effect on that object.

### Player

The normal game begins with an empty roster. `await game.addPlayer()` generates a valid ID, number, colour, and playful name. Do not hard-code starting players unless the visitor explicitly asks for that mechanic.

For a test or requested predefined player:

```js
const player = new Player({
  id: 'cabbage-fan',
  name: 'Cabbage Fan',
  position: 0,
  stats: { cabbages: 4 },
  inventory: [],
  effects: []
});
```

## Events and commands

Prefer these public commands:

```js
await player.move(3);
await player.moveTo(20);
await player.addItem(item);
await player.addEffect(effect);
await player.addCard(card);
await game.rollDice(dice);
await game.drawCard(deck, player);
await game.playCard(card, player);
await game.discardCard(card, player);
await game.addDeck(deck);
await game.addRule(rule);
await game.addAction(action);
await game.changePhase('action');
await game.endTurn();
```

Common proposal/completion event pairs include:

- `player:moving` / `player:moved`
- `player:teleporting` / `player:moved`
- `object:stat-changing` / `object:stat-changed`
- `player:stat-changing` / `player:stat-changed`
- `die:rolling`, `die:resolving` / `die:rolled`
- `dice:rolling` / `dice:rolled`
- `card:drawing` / `card:drawn`
- `card:playing` / `card:played`
- `card:discarding` / `card:discarded`
- `player:item-adding` / `player:item-added`
- `player:effect-adding` / `player:effect-added`
- `player:card-adding` / `player:card-added`
- `deck:adding` / `deck:added`
- `rule:adding` / `rule:added`
- `action:adding` / `action:added`
- `turn:starting` / `turn:started`
- `turn:ending` / `turn:ended`

Read the command that emits an event before relying on its detail fields. Proposal handlers share one mutable object and run in registration order. Some commands dispatch that object through a generic event and then a more specific event; stat changes, for example, reach `object:stat-changing` before `player:stat-changing`. Cancellation is finalised only after every applicable proposal listener has run. A cancelled command normally returns `null`, `false`, the previous value, or the unchanged position, depending on the command; check the local method when that distinction matters. Passing a reason to `event.cancel(reason)` adds that reason to the game log automatically.

## UI changes

The existing UI automatically renders board squares, players, player stats, inventory, effects, dice, decks, player hands, cards, actions, and log entries. Add game content first and change a component only when the requested idea introduces genuinely new presentation.

When editing Svelte:

- keep canonical game state in engine objects;
- use native buttons and form controls;
- preserve accessible names, keyboard operation, focus indicators, and non-colour identifiers;
- use Bootstrap for ordinary layout and controls, with small custom CSS where the game board needs it;
- keep large collections below the board and immediate turn controls in the sidebar;
- render collections and stats from data rather than hard-coding known content.

## Keep the handoff clean

Use explicit paths with `git add` so unrelated worktree changes are not included, then commit without waiting for another prompt:

```sh
git add path/to/changed-file
git commit -m "Add concise feature name"
```

Your final response should briefly state what the visitor added, any checks you chose to run, and the commit hash. Do not spend the visitor's time performing redundant repository inspections when the change is already understood. The next visitor should inherit a clean worktree containing this visitor's committed feature.
