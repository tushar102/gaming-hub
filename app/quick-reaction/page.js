import React from "react";

function Game21() {
  return (
    <div style={{ textAlign: "center" }}>
      <iframe
        title="My JavaScript Game"
        src="games/HillRacingGame/index.html"
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
        }}
      />
    </div>
  );
}

export default Game21;
