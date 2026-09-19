const adjectives = [
  'Recursive', 'Chaotic', 'Suspicious', 'Caffeinated', 'Sleepy', 'Quantum', 'Wobbly', 'Brave',
  'Bewildered', 'Bouncy', 'Cursed', 'Dramatic', 'Electric', 'Feral', 'Fluffy', 'Galactic',
  'Grumpy', 'Invisible', 'Jittery', 'Lost', 'Magnificent', 'Noisy', 'Peculiar', 'Polite',
  'Sparkly', 'Spicy', 'Unlicensed', 'Unscheduled', 'Wonky', 'Confused', 'Cheeky', 'Mysterious'
];

const nouns = [
  'Potato', 'Badger', 'Compiler', 'Goblin', 'Penguin', 'Teapot', 'Dragon', 'Turnip',
  'Cabbage', 'Ferret', 'Toaster', 'Wizard', 'Pigeon', 'Spreadsheet', 'Kettle', 'Newt',
  'Sock', 'Algorithm', 'Biscuit', 'Goose', 'Crab', 'Gremlin', 'Keyboard', 'Mushroom',
  'Robot', 'Scone', 'Slug', 'Traffic-Cone', 'Lobster', 'Sandwich', 'Debugger', 'Wheelbarrow'
];

export function randomPlayerName() {
  const pick = (words) => words[Math.floor(Math.random() * words.length)];
  return `${pick(adjectives)} ${pick(nouns)}`;
}
