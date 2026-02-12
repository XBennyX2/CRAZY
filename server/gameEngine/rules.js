// --- CRAZY Rules Helper Functions ---

/**
 * Checks if a card causes the next player to draw cards (+2 or +5).
 */
function isDrawCard(card) {
  if (!card) return false;
  const rank = String(card.rank);
  // Penalty cards are all 2s and specifically the Ace of Spades
  return rank === '2' || (rank === 'A' && card.suit === 'spades');
}

/**
 * Penalty Stacking ("Countering") Logic
 * Implements the "Bridge" rules for the Ace of Spades (+5).
 */
function canStack(card, topCard) {
  if (!card || !topCard) return false;

  const cRank = String(card.rank);
  const cSuit = card.suit;
  const tRank = String(topCard.rank);
  const tSuit = topCard.suit;

  if (!isDrawCard(topCard)) return false;

  // 1. The "Ace of Spades" (+5) Bridge
  if (tRank === 'A' && tSuit === 'spades') {
    // Only the 2 of Spades can "catch" the Ace of Spades, or another Ace of Spades
    return (cRank === '2' && cSuit === 'spades') || (cRank === 'A' && cSuit === 'spades');
  }

  // 2. The "2 of Spades" Bridge (Going back up)
  if (tRank === '2' && tSuit === 'spades') {
    // On 2 of Spades, you can play the Ace of Spades (+5) or any other 2
    return (cRank === 'A' && cSuit === 'spades') || cRank === '2';
  }

  // 3. Standard 2s
  // Any 2 can be played on any other 2 (except the AoS restriction handled above)
  if (cRank === '2' && tRank === '2') return true;

  // Note: Wild cards (8, J, Joker) are allowed to stack by default in playCard logic
  return false;
}

/**
 * Ranks that allow a player to change the active suit.
 */
function isSuitChangeCard(card) {
  if (!card) return false;
  const rank = String(card.rank);
  // Included Joker for your wild-card rule
  return rank === '8' || rank === 'J' || rank === 'JOKER';
}

function isSkipCard(card, settings) {
  if (!card) return false;
  // Dynamic check based on room settings (usually Q or 10)
  return String(card.rank) === String(settings.skipCard);
}

function isReverseCard(card, settings) {
  if (!card) return false;
  // Dynamic check based on room settings (usually 9 or K)
  return String(card.rank) === String(settings.reverseCard);
}

/**
 * Standard matching logic for a normal turn.
 */
function matches(card, currentSuit, topCard, suitChangeLock) {
  if (!card || !topCard) return false;
  
  if (isSuitChangeCard(card)) return true; // Wild cards always match
  
  if (suitChangeLock) {
    // If an 8, J, or Joker was just played, you MUST match the chosen suit
    return card.suit === currentSuit;
  } else {
    // Match by Suit OR Match by Rank
    return card.suit === currentSuit || String(card.rank) === String(topCard.rank);
  }
}

/**
 * Standard Fisher-Yates Shuffle
 */
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