export function assertId(object, kind) {
  if (!object?.id || typeof object.id !== 'string') throw new Error(`A ${kind} needs an ID`);
}

export function assertUniqueIds(objects, kind) {
  const ids = new Set();
  for (const object of objects) {
    assertId(object, kind);
    if (ids.has(object.id)) throw new Error(`${kind[0].toUpperCase()}${kind.slice(1)} ID already exists: ${object.id}`);
    ids.add(object.id);
  }
}
