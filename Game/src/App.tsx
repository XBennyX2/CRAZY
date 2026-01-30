import { useState } from "react";
import { createTestGame } from "./game/dev/initGame";
import { canPlayCard } from "./game/rules/validators";
import { applyCardEffects } from "./game/rules/applyPlay";
import { getNextPlayerIndex } from "./game/engine/turn";
import type { GameState } from "./game/models/GameState";

export default function App() {
  const [game, setGame] = useState<GameState>(createTestGame());

  const currentPlayer = game.players[game.currentPlayerIndex];

  function playCard(cardIndex: number) {
    const card = currentPlayer.hand[cardIndex];
    const result = canPlayCard(game, card);

    if (!result.valid) {
      alert(result.reason);
      return;
    }

    // clone FIRST
    let next = structuredClone(game);

    // remove card from cloned player
    next.players[next.currentPlayerIndex].hand.splice(cardIndex, 1);

    // apply rules
    next = applyCardEffects(next, card, "clubs");

    // advance turn
    next.currentPlayerIndex = getNextPlayerIndex(next);

    setGame(next);
  }

  function drawCard() {
    const next = structuredClone(game);
    const player = next.players[next.currentPlayerIndex];

    const card = next.deck.pop();
    if (card) player.hand.push(card);

    // pass turn after draw
    next.currentPlayerIndex = getNextPlayerIndex(next);

    setGame(next);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>CRAZY – Dev Test Mode</h2>

      <p>
        Current Player: <b>{currentPlayer.name}</b>
      </p>

      <p>Current Suit: {game.currentSuit}</p>
      <p>Draw Stack: {game.drawStack}</p>

      <h3>Hand</h3>
      {currentPlayer.hand.map((c, i) => (
        <button
          key={c.id}
          onClick={() => playCard(i)}
          style={{ marginRight: 8 }}
        >
          {c.rank} of {c.suit}
        </button>
      ))}

      <br /><br />

      <button onClick={drawCard}>Draw</button>

      <pre style={{ marginTop: 20 }}>
        {JSON.stringify(game, null, 2)}
      </pre>
    </div>
  );
}
