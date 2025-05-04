let canvas = document.getElementById("canvas");
const updateCanvasSize = () => {
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
};
updateCanvasSize();
let c = canvas.getContext("2d");


let score = 0;
let count = 0;
let scoreNew = document.getElementById("score");
let distanceElement = document.getElementById("distance");

const images = {
  car: new Image(),
  track: new Image(),
  coin: new Image(),
  petrol: new Image(),
  background: new Image()
};
images.car.src = "/images/car2.jpg";
images.track.src = "/images/track.png";
images.coin.src = "/images/coin.png";
images.petrol.src = "/images/petrolTanker.png";
images.background.src = "/images/888.jpg";

// Sounds
const sounds = {
  engine: new Audio("/sounds/engine.mp3"),
  coinCollect: new Audio("/sounds/coin.mp3"),
  fuelCollect: new Audio("/sounds/fuel.mp3"),
  lowFuel: new Audio("/sounds/low_fuel.mp3"),
  gameOver: new Audio("/sounds/game_over.mp3")
};

// Configure sound properties
sounds.engine.loop = true;
sounds.lowFuel.loop = true;
sounds.engine.volume = 0.5;
sounds.coinCollect.volume = 0.7;
sounds.fuelCollect.volume = 0.7;
sounds.lowFuel.volume = 0.4;
sounds.gameOver.volume = 0.8;

// Sound state tracking
let lowFuelPlaying = false;
let enginePlaying = false;
let lastEngineRate = 1.5;

// Ensure images are loaded before starting
let imagesLoaded = 0;
const totalImages = Object.keys(images).length;
function imageLoaded() {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    console.log("All images loaded");
  }
}

Object.values(images).forEach(img => img.onload = imageLoaded);

// Track generation
let pLine = document.getElementById("petrol-line");
let start = 250;
let A = new Array(canvas.width).fill(0);
const N = 30; // Even fewer segments for smoother, bigger mountains
// Increased amplitude for bigger mountains
let amplitude = 120; // Increased more for even bigger mountains
let layers = Array.from({ length: N }, () => Math.random() * amplitude);

// Smoother interpolation function
const trigno = (a, b, c) => a + b + (a - b) * Math.cos(Math.PI * c);

function land(x) {
  x = x / 300; // Increased from 250 to 300 for even wider mountains
  let fx = Math.floor(x) % N;
  let nextFx = (fx + 1) % N;
  return trigno(layers[fx], layers[nextFx], x - Math.floor(x));
}

// Car setup
let carDistance = 0;
// FIXED: Car position is now constant - doesn't move horizontally
const cX = 100; // Fixed position at left side of screen
let carVelocity = 0; // Add velocity for smoother movement
const carAcceleration = 0.15; // Reduced for even smoother acceleration
const carDeceleration = 0.08; // Reduced for smoother deceleration
const maxCarSpeed = 4.5; // Reduced max speed for better control

// Car dimensions and properties - Responsive sizing
const getCarDimensions = () => {
  // Make car size responsive based on screen width
  const baseWidth = 130;
  const baseHeight = 100;
  const scaleFactor = Math.min(1, window.innerWidth / 1000);
  
  return {
    width: baseWidth * scaleFactor,
    height: baseHeight * scaleFactor,
    wheelRadius: 20 * scaleFactor,
    bottomOffset: 10 * scaleFactor // Reduced to keep car closer to ground
  };
};

// Collectible sizes - make them bigger and responsive
const getCollectibleSize = () => {
  const baseSize = 50; // Increased from 40
  const scaleFactor = Math.min(1, window.innerWidth / 1000);
  return baseSize * scaleFactor;
};

// Collectible vertical position adjustment
const collectibleYOffset = 40; // Increased to position them higher above ground

let carKeys = {
  right: { pressed: false },
  left: { pressed: false }
};

function dCalculate() {
  count += carKeys.right.pressed ? 0.1 : (carKeys.left.pressed ? -0.1 : 0);
  distanceElement.innerHTML = Math.floor(count);
}

// Coins and Petrol
let h1 = 1;
let coinDistance = canvas.width;
let coinDistance1 = canvas.width / 2;
let coinDistance2 = canvas.width / 4;

function drawCoin(x, y) {
  if (x >= 0 && x <= canvas.width) {
    const size = getCollectibleSize();
    c.drawImage(images.coin, x - size/2, y - collectibleYOffset - size/2, size, size);
  }
}

function drawPetrol(x, y) {
  if (x >= 0 && x <= canvas.width) {
    const size = getCollectibleSize();
    c.drawImage(images.petrol, x - size/2, y - collectibleYOffset - size/2, size, size);
  }
}

// Animation
let position = 0;
let gameStarted = false;
let lastTimestamp = 0;
let isPaused = false;

// Add function to calculate terrain angle - critical for car rotation
function getTerrainAngle(x) {
  // Get heights at x and a bit ahead
  const x1 = Math.floor(x);
  const x2 = Math.floor(x + 10);
  
  // Make sure indices are within bounds
  if (x1 < 0 || x2 >= A.length) return 0;
  
  // Calculate angle based on height difference
  const y1 = A[x1];
  const y2 = A[x2];
  return Math.atan2(y2 - y1, 10);
}

// FIXED: Improved sound management functions
function updateSounds() {
  // Fix engine sound behavior based on velocity and paused state
  if (Math.abs(carVelocity) > 0.1 && !isPaused) {
    // Calculate target rate based on speed - smoother transition
    const targetRate = 0.8 + Math.abs(carVelocity) / maxCarSpeed;
    
    // Start engine if not playing
    if (!enginePlaying) {
      sounds.engine = new Audio("/sounds/engine.mp3");
      sounds.engine.loop = true;
      sounds.engine.volume = 0.5;
      
      sounds.engine.play().catch(err => console.log("Error playing engine sound:", err));
      enginePlaying = true;
      lastEngineRate = targetRate;
    }
    
    // Gradually adjust engine pitch for smoother sound transition
    const rateChangeSpeed = 0.05;
    if (Math.abs(lastEngineRate - targetRate) > 0.01) {
      if (lastEngineRate < targetRate) {
        lastEngineRate += rateChangeSpeed;
      } else {
        lastEngineRate -= rateChangeSpeed;
      }
      sounds.engine.playbackRate = lastEngineRate;
    }
  } else {
    // If car stopped or game paused, gradually slow down engine sound
    if (enginePlaying) {
      // Gradually decrease playback rate for realistic engine slowdown
      sounds.engine.pause();
      sounds.engine.currentTime = 0; // Reset sound to beginning
      enginePlaying = false;
    }
  }
  
  // Low fuel warning sound
  if (start < 80 && !isPaused) {
    if (!lowFuelPlaying) {
      sounds.lowFuel.play().catch(err => console.log("Error playing low fuel sound:", err));
      lowFuelPlaying = true;
    }
  } else if (lowFuelPlaying) {
    sounds.lowFuel.pause();
    sounds.lowFuel.currentTime = 0;
    lowFuelPlaying = false;
  }
}

// FIXED: Added frame-rate independent animation
function animate(timestamp) {
  if (!gameStarted) return;
  
  // Calculate delta time for smooth animation regardless of frame rate
  const deltaTime = lastTimestamp ? (timestamp - lastTimestamp) / 16.67 : 1; // Normalized to 60fps
  lastTimestamp = timestamp;
  
  // Check if game is paused
  if (document.hidden) {
    isPaused = true;
    requestAnimationFrame(animate);
    return;
  } else {
    isPaused = false;
  }

  // Clear canvas and draw background
  c.fillStyle = "#87CEEB"; // Fallback sky color
  c.fillRect(0, 0, canvas.width, canvas.height);
  if (images.background.complete) {
    c.drawImage(images.background, 0, 0, canvas.width, canvas.height);
  }

  // Draw track
  c.beginPath();
  c.moveTo(0, canvas.height);
  for (let i = 0; i < canvas.width; i++) {
    let y = canvas.height - land(i + position);
    A[i] = y;
    c.lineTo(i, y);
  }
  c.lineTo(canvas.width, canvas.height);
  c.closePath();

  // Fill track with pattern
  let pattern = c.createPattern(images.track, "repeat");
  c.fillStyle = pattern || "#808080"; // Fallback color
  c.fill();

  // Draw grass layer
  c.beginPath();
  c.moveTo(0, canvas.width);
  for (let i = 0; i < canvas.width; i++) {
    let y = A[i] - 5;
    c.lineTo(i, y);
  }
  c.lineTo(canvas.width, canvas.height);
  c.closePath();
  c.fillStyle = "green";
  c.fill();

  // Draw ground layer
  c.beginPath();
  c.moveTo(0, canvas.height);
  for (let i = 0; i < canvas.width; i++) {
    let y = A[i] + 10;
    c.lineTo(i, y);
  }
  c.lineTo(canvas.width, canvas.height);
  c.closePath();
  c.fillStyle = "#8B4513"; // Reddish-brown
  c.fill();

  // Update car velocity (smoother acceleration/deceleration) with delta time
  if (carKeys.right.pressed && carVelocity < maxCarSpeed) {
    carVelocity += carAcceleration * deltaTime;
    if (carVelocity > maxCarSpeed) carVelocity = maxCarSpeed;
  } else if (carKeys.left.pressed && carVelocity > -maxCarSpeed) {
    carVelocity -= carAcceleration * deltaTime;
    if (carVelocity < -maxCarSpeed) carVelocity = -maxCarSpeed;
  } else {
    // Decelerate when no keys are pressed
    if (carVelocity > 0) {
      carVelocity -= carDeceleration * deltaTime;
      if (carVelocity < 0) carVelocity = 0;
    } else if (carVelocity < 0) {
      carVelocity += carDeceleration * deltaTime;
      if (carVelocity > 0) carVelocity = 0;
    }
  }

  // Update sounds based on game state
  updateSounds();

  // Update position with delta time for consistent movement
  position += carVelocity * deltaTime;
  h1 = carVelocity > 0 ? 3 * deltaTime : (carVelocity < 0 ? -3 * deltaTime : 1);

  // Get car dimensions (responsive)
  const { width: carWidth, height: carHeight, wheelRadius, bottomOffset } = getCarDimensions();

  // FIXED: Calculate car position - KEY FIX: position car wheels exactly on terrain
  const terrainYAtCar = A[Math.floor(cX + carWidth/2)] || canvas.height/2;
  
  // FIXED: Calculate car position based on terrain (wheels should touch the ground)
  // Reduced bottomOffset to keep car closer to ground
  const carY = terrainYAtCar - carHeight + wheelRadius - bottomOffset;
  
  // Get terrain angle for car rotation - CRITICAL FIX for realistic movement
  const terrainAngle = getTerrainAngle(cX + carWidth/2);

  // Draw car with proper positioning and rotation
  if (cX >= 0 && cX <= canvas.width) {
    c.save(); // Save canvas state
    
    // Translate to car center, rotate, then draw car
    c.translate(cX + carWidth/2, carY + carHeight/2);
    c.rotate(terrainAngle); // Rotate car to match terrain angle
    c.drawImage(
      images.car, 
      -carWidth/2, // Draw from center
      -carHeight/2, 
      carWidth, 
      carHeight
    );
    
    c.restore(); // Restore canvas state
  }

  // Draw coins and petrol
  // FIXED: Collectibles now move with the same logic as the terrain
  coinDistance -= h1;
  coinDistance1 -= h1;
  coinDistance2 -= h1;

  // Reset coin positions when they go off screen
  if (coinDistance < -50) coinDistance = canvas.width + Math.random() * 200;
  if (coinDistance1 < -50) coinDistance1 = canvas.width + Math.random() * 200;
  if (coinDistance2 < -50) coinDistance2 = canvas.width + Math.random() * 200;

  // Draw collectibles - centered and raised position
  drawCoin(coinDistance, A[Math.floor(coinDistance) % A.length]);
  drawCoin(coinDistance1, A[Math.floor(coinDistance1) % A.length]);
  drawPetrol(coinDistance2, A[Math.floor(coinDistance2) % A.length]);

  // Collect coins and petrol - improved collision detection
  const collectionSize = getCollectibleSize();
  const collisionDistance = collectionSize * 0.7; // Adjusted for better collision detection
  
  // Get car's current terrain position for more accurate collision
  const carTerrainY = A[Math.floor(cX + carWidth/2) % A.length];
  
  if (Math.abs(coinDistance - (cX + carWidth/2)) < collisionDistance && 
      Math.abs(A[Math.floor(coinDistance) % A.length] - carTerrainY) < 80) {
    coinDistance = canvas.width + Math.random() * 200;
    score += 50;
    // Play coin sound
    sounds.coinCollect.currentTime = 0;
    sounds.coinCollect.play().catch(err => console.log("Error playing coin sound:", err));
  }
  
  if (Math.abs(coinDistance1 - (cX + carWidth/2)) < collisionDistance && 
      Math.abs(A[Math.floor(coinDistance1) % A.length] - carTerrainY) < 80) {
    coinDistance1 = canvas.width + Math.random() * 200;
    score += 50;
    // Play coin sound
    sounds.coinCollect.currentTime = 0;
    sounds.coinCollect.play().catch(err => console.log("Error playing coin sound:", err));
  }
  
  if (Math.abs(coinDistance2 - (cX + carWidth/2)) < collisionDistance && 
      Math.abs(A[Math.floor(coinDistance2) % A.length] - carTerrainY) < 80) {
    coinDistance2 = canvas.width + Math.random() * 200;
    pLine.style.backgroundColor = "rgb(21, 139, 41)";
    start = 250;
    
    // Play fuel sound
    sounds.fuelCollect.currentTime = 0;
    sounds.fuelCollect.play().catch(err => console.log("Error playing fuel sound:", err));
    
    // Stop low fuel warning if it was playing
    if (lowFuelPlaying) {
      sounds.lowFuel.pause();
      lowFuelPlaying = false;
    }
  }

  scoreNew.innerHTML = score;
  dCalculate();
  requestAnimationFrame(animate);
}

// Add touch controls for mobile
function setupTouchControls() {
  // Create touch controls container
  const touchControls = document.createElement("div");
  touchControls.id = "touch-controls";
  touchControls.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 1000;
  `;
  
  // Create left button
  const leftBtn = document.createElement("div");
  leftBtn.id = "touch-left";
  leftBtn.style.cssText = `
    width: 80px;
    height: 80px;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
  `;
  leftBtn.innerHTML = "←";
  leftBtn.style.fontSize = "30px";
  
  // Create right button
  const rightBtn = document.createElement("div");
  rightBtn.id = "touch-right";
  rightBtn.style.cssText = `
    width: 80px;
    height: 80px;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
  `;
  rightBtn.innerHTML = "→";
  rightBtn.style.fontSize = "30px";
  
  // Add buttons to container
  touchControls.appendChild(leftBtn);
  touchControls.appendChild(rightBtn);
  
  // Add container to document
  document.body.appendChild(touchControls);
  
  // Add touch event listeners
  leftBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    carKeys.left.pressed = true;
  });
  
  leftBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    carKeys.left.pressed = false;
  });
  
  rightBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    carKeys.right.pressed = true;
  });
  
  rightBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    carKeys.right.pressed = false;
  });
}

// Event Listeners
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    carKeys.right.pressed = true;
  }
  if (event.key === "ArrowLeft") {
    carKeys.left.pressed = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowRight") {
    carKeys.right.pressed = false;
  }
  if (event.key === "ArrowLeft") {
    carKeys.left.pressed = false;
  }
});

// Function to handle game over
function gameOver() {
  // Stop all sounds
  Object.values(sounds).forEach(sound => {
    sound.pause();
    sound.currentTime = 0;
  });
  
  // Play game over sound
  sounds.gameOver.play().catch(err => console.log("Error playing game over sound:", err));
  
  // Redirect to game over page
  window.location.assign("/html/out.html");
}

// Petrol
let PBar = setInterval(() => {
  if (!isPaused && gameStarted) {
    start -= 5;
    if (start < 150 && start > 80) pLine.style.backgroundColor = "#FFFF00";
    if (start < 80) pLine.style.backgroundColor = "#FF0000";
    if (start < -2) {
      clearInterval(PBar);
      gameOver();
    }
    pLine.style.width = start + "px";
  }
}, 500);

// Make UI elements responsive
function makeUIResponsive() {
  const fuelSection = document.getElementById("petrol");
  const scoreSection = document.getElementById("score1");
  const distanceSection = document.getElementById("distance-container");
  
  if (window.innerWidth < 768) {
    // Adjust sizes for mobile
    if (fuelSection) fuelSection.style.fontSize = "14px";
    if (scoreSection) scoreSection.style.fontSize = "14px";
    if (distanceSection) distanceSection.style.fontSize = "14px";
    
    document.querySelectorAll("#fuel-image, #coin-image").forEach(img => {
      img.style.width = "24px";
      img.style.height = "24px";
    });
  } else {
    // Reset to default for larger screens
    if (fuelSection) fuelSection.style.fontSize = "";
    if (scoreSection) scoreSection.style.fontSize = "";
    if (distanceSection) distanceSection.style.fontSize = "";
    
    document.querySelectorAll("#fuel-image, #coin-image").forEach(img => {
      img.style.width = "";
      img.style.height = "";
    });
  }
}

// Handle window resize
window.addEventListener("resize", () => {
  updateCanvasSize();
  makeUIResponsive();
  
  // Regenerate terrain array for new width
  A = new Array(canvas.width).fill(0);
});

// Start game
document.getElementById("click-me").addEventListener("click", () => {
  document.getElementById("click-me").style.display = "none";

  document.getElementById("section1").style.visibility = "hidden";
  ["petrol", "petrol-line", "distance", "line", "score1", "fuel1", "fuel-image", "coin-image"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.visibility = "visible";
  });
  
  // Check if on mobile and add touch controls
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    setupTouchControls();
  }
  
  // Make UI responsive
  makeUIResponsive();
  
  gameStarted = true;
  animate();
});

// Pause sounds when tab is not visible
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    isPaused = true;
    // Pause all sounds if tab is not visible
    Object.values(sounds).forEach(sound => {
      if (!sound.paused) {
        sound.pause();
      }
    });
  } else {
    isPaused = false;
    if (gameStarted) {
      // Resume engine sound if game is active and car is moving
      if (Math.abs(carVelocity) > 0.1) {
        sounds.engine = new Audio("/sounds/engine.mp3");
        sounds.engine.loop = true;
        sounds.engine.volume = 0.5;
        sounds.engine.playbackRate = lastEngineRate;

        sounds.engine.play().catch(err => console.log("Visibility change error:", err));
        enginePlaying = true;
      }
      
      // Resume low fuel warning if applicable
      if (start < 80 && !lowFuelPlaying) {
        sounds.lowFuel.play().catch(err => console.log("Visibility change error:", err));
        lowFuelPlaying = true;
      }
    }
  }
});