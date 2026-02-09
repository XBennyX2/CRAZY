// --- CRAZY Rules Helper Functions ---

function isDrawCard(card) {
  if (!card) return false;
  const rank = String(card.rank); // Ensure we are comparing strings
  // Rank 2 (any suit) or Ace of Spades
  return rank === '2' || (rank === 'A' && card.suit === 'spades');
}

function canStack(card, topCard) {
  if (!card || !topCard) return false;
  
  const cardRank = String(card.rank);
  const topRank = String(topCard.rank);

  // If the top card isn't a draw card, stacking rules don't apply
  if (!isDrawCard(topCard)) return false;

  // 1. Any 2 can stack on any other 2
  if (cardRank === '2' && topRank === '2') return true;

  // 2. Ace of Spades can stack on Ace of Spades
  if (cardRank === 'A' && card.suit === 'spades' &&
      topRank === 'A' && topCard.suit === 'spades') return true;

  // 3. 2 of Spades on Ace of Spades (and vice versa)
  if (cardRank === '2' && card.suit === 'spades' &&
      topRank === 'A' && topCard.suit === 'spades') return true;

  if (cardRank === 'A' && card.suit === 'spades' &&
      topRank === '2' && topCard.suit === 'spades') return true;

  return false;
}

function isSuitChangeCard(card) {
  if (!card) return false;
  const rank = String(card.rank);
  return rank === '8' || rank === 'J' || rank === 'JOKER';
}

function isSkipCard(card, settings) {
  if (!card) return false;
  return String(card.rank) === String(settings.skipCard);
}

function isReverseCard(card, settings) {
  if (!card) return false;
  return String(card.rank) === String(settings.reverseCard);
}

// Check if a card is playable on top of current discard
function matches(card, currentSuit, topCard, suitChangeLock) {
  if (!card || !topCard) return false;
  
  const isWild = isSuitChangeCard(card);
  
  if (suitChangeLock) {
    // If someone played an 8/Jack/Joker, you MUST match the chosen suit 
    // or play another Wild card to hijack the suit again.
    return card.suit === currentSuit || isWild;
  } else {
    // Normal play: suit match, rank match, or play a Wild
    return card.suit === currentSuit || String(card.rank) === String(topCard.rank) || isWild;
  }
}

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