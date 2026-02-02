// --- CRAZY Rules Helper Functions ---

function isDrawCard(card) {
  // 2 or Ace of Spades or 2 of Spades
  return card.rank === 2 || (card.rank === 'A' && card.suit === 'spades');
}

function canStack(card, topCard) {
  // Only draw cards can stack
  if (!isDrawCard(card) || !isDrawCard(topCard)) return false;

  // 2 on 2
  if (card.rank === 2 && topCard.rank === 2) return true;

  // Ace of Spades on Ace of Spades
  if (card.rank === 'A' && card.suit === 'spades' &&
      topCard.rank === 'A' && topCard.suit === 'spades') return true;

  // 2 of Spades on Ace of Spades
  if (card.rank === 2 && card.suit === 'spades' &&
      topCard.rank === 'A' && topCard.suit === 'spades') return true;

  // Ace of Spades on 2 of Spades
  if (card.rank === 'A' && card.suit === 'spades' &&
      topCard.rank === 2 && topCard.suit === 'spades') return true;

  return false;
}

function isSuitChangeCard(card) {
  return card.rank === 8 || card.rank === 'J' || card.rank === 'JOKER';
}

function isSkipCard(card, settings) {
  return card.rank === settings.skipCard;
}

function isReverseCard(card, settings) {
  return card.rank === settings.reverseCard;
}

// Check if a card is playable on top of current discard
function matches(card, currentSuit, topCard, suitChangeLock) {
  if (suitChangeLock) {
    // Only suit match or suit-change card allowed
    return card.suit === currentSuit || isSuitChangeCard(card);
  } else {
    // Normal play: suit or rank match or suit-change card
    return card.suit === currentSuit || card.rank === topCard.rank || isSuitChangeCard(card);
  }
}

// Fisher-Yates shuffle
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = {
  isDrawCard,
  canStack,
  isSuitChangeCard,
  isSkipCard,
  isReverseCard,
  matches,
  shuffle
};
