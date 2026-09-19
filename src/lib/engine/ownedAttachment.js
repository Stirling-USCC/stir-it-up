export async function setupOwnedAttachment(attachment, game, owner) {
  if (attachment.active) return;
  attachment.active = true;
  attachment.game = game;
  attachment.owner = owner;

  try {
    for (const [type, handler] of Object.entries(attachment.handlers)) {
      attachment.unsubscribers.push(game.events.on(type, (detail) => handler(game, detail, owner, attachment)));
    }
    await attachment.onAdd(game, owner);
  } catch (error) {
    for (const unsubscribe of attachment.unsubscribers) unsubscribe();
    attachment.unsubscribers = [];
    attachment.active = false;
    attachment.game = null;
    attachment.owner = null;
    throw error;
  }
}

export async function teardownOwnedAttachment(attachment) {
  if (!attachment.active) return;
  const game = attachment.game;
  const owner = attachment.owner;

  for (const unsubscribe of attachment.unsubscribers) unsubscribe();
  attachment.unsubscribers = [];
  attachment.active = false;

  try {
    if (game && owner) await attachment.onRemove(game, owner);
  } finally {
    attachment.game = null;
    attachment.owner = null;
  }
}
