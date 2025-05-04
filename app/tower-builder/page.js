// src/components/MyJsGamePage.jsx
import React from "react";

function Game3() {
  return (
    <div style={{ textAlign: "center" }}>
      <iframe
        title="My JavaScript Game"
        src="/games/tower_game/tower.html" // This path points to your game folder in public
        style={{
          width: "100%",
          height: "100vh", // Adjust as needed
          border: "none",
        }}
      />
    </div>
  );
}

export default Game3;
