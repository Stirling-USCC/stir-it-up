# Open day agent guide

Your job is to turn one visitor's idea into a small, working addition to **Stir it Up!**, usually in one implementation prompt and about five minutes. Make reasonable choices, keep the change local, verify it, and commit it automatically.

## Work quickly

1. Read the visitor's request and run `git status --short`.
2. Read only the relevant engine class, `src/lib/game/createGame.js`, and one similar example. Use `src/lib/game/createShowcaseGame.svelte.js` when you need examples of every hook working together.
3. Implement the smallest complete and playful version of the idea. Infer minor details instead of asking questions.
4. Run `npm test` and `npm run check`. Run `npm run build` as well when changing routes, project configuration, or dependencies.
5. Review `git diff` and `git diff --check`.
6. Stage only the files you changed and commit them with a short, specific imperative message, such as `Add cabbage rain card`.
7. Run `git status --short` and report the commit and checks.

If the visitor only asks to discuss or plan an idea, do not modify files and do not create an empty commit. Once a prompt asks you to implement or change the project, always commit the finished change without asking for confirmation. Never amend or rewrite an earlier visitor's commit. If the worktree was already dirty, preserve those unrelated changes and keep them out of your commit.

Do not depend on web searches, external documentation, Playwright, or extra agent tools. The local engine, components, tests, and showcase are the source of truth.

## Where changes belong

- **Game content:** `src/lib/game/createGame.js`
- **Engine capability needed by many features:** `src/lib/engine/`
- **Rendering and browser interaction:** `src/lib/components/`
- **Shared styling:** `src/app.css`
- **Tests:** `tests/`
- **Working examples:** `src/lib/game/createShowcaseGame.svelte.js`

Add real visitor content to `createGame.js`. Do not add it only to the showcase. Do not edit the engine when an existing object, hook, command, stat, or rule can express the idea. Do not add a package for something that can be written clearly in a few lines.

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
| `Player` | `id`, `name` | `number`, `colour`, `position`, `active`, `icon`, `className`, `stats`, `inventory`, `effects`; normally created through the roster |
| `Die` | `id` | `name`, `sides`, `colour`, `stats`, custom `roll(context)` function |
| `DiceRoll` | created by `game.rollDice()` | preserves `{ die, value }` results; has `total`, `min`, and `max` helpers |
| `Card` | `id`, `name` | `description`, `image`, `icon`, `className`, `stats`; async `onDraw`, `onPlay`, `onDiscard` hooks |
| `Deck` | `id`, `name` | `cards`, `stats`; `draw`, `discard`, `reset`, `shuffle` commands |
| `Action` | `id`, `label`, `perform` | `description`, `available`, `variant`, `icon`, `emphasis`, `stats` |
| `InventoryItem` | `id`, `name` | `description`, `metadata`, `stats`; behaviour normally comes from a rule or the feature that uses it |
| `Effect` | `id`, `name` | `description`, `duration`, `metadata`, `stats`; behaviour normally comes from a rule |
| `Rule` | `id`, `name` | `description`, `stats`, map of event `handlers` |
| `Turn` | supplied by `Game` | configurable `phases`; current number, player ID, and phase |

`position` is the square's zero-based index in the board's logical order. The UI displays `position + 1`. `coordinates: { x, y }` control spatial layout and keyboard navigation and may contain fractional values. The default board runs left-to-right and top-to-bottom.

## Copyable feature examples

Import the objects you use at the top of `createGame.js`, create them inside `createGame()`, and include them in the returned `Game` or its board.

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

// Include `decks: [chaosDeck]` in the Game constructor.
```

A deck tracks its full card list, draw pile, and discard pile. Drawing does not automatically give a card to a player. If the visitor wants playable cards, add an action or other mechanic that remembers the drawn card, then calls `card.play(player)` or `deck.discard(card, player)`. Inspect the showcase for a complete small example.

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

// Include it in `dice`, or later call `await game.addDie(oddDie)`.
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

Actions render automatically. Keep Bootstrap class construction in the UI: use a variant name such as `primary`, `warning`, or `danger`, not a raw class string. Use `emphasis: 'primary'` only for the main recommended action.

### Inventory item

```js
const springBoots = new InventoryItem({
  id: 'spring-boots',
  name: 'Spring Boots',
  description: 'Walking moves two extra squares.',
  stats: { bonus: 2 }
});

await player.addItem(springBoots);
```

Items store persistent player-owned state. Give them behaviour through the square, card, action, or rule that cares about them. Add and remove them with `player.addItem(item)` and `player.removeItem(id)` so events and UI updates occur.

### Effect

```js
const rooted = new Effect({
  id: 'rooted',
  name: 'Rooted',
  description: 'Cannot walk.',
  duration: 1
});

await player.addEffect(rooted);
```

Effects describe state attached to a player. A rule supplies ongoing behaviour. Use `player.addEffect(effect)` and `player.removeEffect(id)` rather than editing `player.effects` directly during play.

### Rule

```js
const troublesomeFootwear = new Rule({
  id: 'troublesome-footwear',
  name: 'Troublesome Footwear',
  description: 'Spring Boots extend walks; Rooted cancels them.',
  handlers: {
    'player:moving': (_game, movement) => {
      if (movement.player.effects.some((effect) => effect.id === 'rooted')) {
        movement.cancel('Rooted players cannot walk.');
        return;
      }
      const boots = movement.player.inventory.find((item) => item.id === 'spring-boots');
      if (boots) movement.amount += boots.getStat('bonus');
    }
  }
});

// Include it in `rules: [troublesomeFootwear]`.
```

Rules are installed when the game starts and removed when it finishes. Use them for behaviour spanning several objects or reacting globally. Keep behaviour belonging only to one square or card on that object's hook.

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
await game.rollDice(dice);
await game.drawCard(deck, player);
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
- `turn:starting` / `turn:started`
- `turn:ending` / `turn:ended`

Read the command that emits an event before relying on its detail fields. Proposal handlers share one mutable object and run in registration order. A cancelled command normally returns `null`, `false`, the previous value, or the unchanged position, depending on the command; check the local method when that distinction matters.

## UI changes

The existing UI automatically renders board squares, players, player stats, inventory, effects, dice, decks, cards, actions, and log entries. Add game content first and change a component only when the requested idea introduces genuinely new presentation.

When editing Svelte:

- keep canonical game state in engine objects;
- use native buttons and form controls;
- preserve accessible names, keyboard operation, focus indicators, and non-colour identifiers;
- use Bootstrap for ordinary layout and controls, with small custom CSS where the game board needs it;
- keep large collections below the board and immediate turn controls in the sidebar;
- render collections and stats from data rather than hard-coding known content.

## Keep the handoff clean

Before committing, inspect the diff for accidental generated files or unrelated edits. Use explicit paths with `git add`, then run:

```sh
git diff --cached --check
git commit -m "Add concise feature name"
git status --short
```

Your final response should briefly state what the visitor added, which checks passed, and the commit hash. The next visitor should inherit a clean worktree containing this visitor's committed feature.
