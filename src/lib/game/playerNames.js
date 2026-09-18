const adjectives = ['Recursive', 'Chaotic', 'Suspicious', 'Caffeinated', 'Sleepy', 'Quantum', 'Wobbly', 'Brave'];
const nouns = ['Potato', 'Badger', 'Compiler', 'Goblin', 'Penguin', 'Teapot', 'Dragon', 'Turnip'];

export function randomPlayerName() {
  const pick = (words) => words[Math.floor(Math.random() * words.length)];
  return `${pick(adjectives)} ${pick(nouns)}`;
}
