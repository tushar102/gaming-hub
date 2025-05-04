import React from "react";

function Game16() {
  return (
    <div style={{ textAlign: "center" }}>
      <iframe
        title="My JavaScript Game"
        src="/games/StackCards/stack.html"
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
        }}
      />
    </div>
  );
}

export default Game16;
