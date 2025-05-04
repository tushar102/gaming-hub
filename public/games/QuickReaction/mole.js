let currMoleTile;
let currPlantTile;
let score = 0;
let gameOver = false;

// Load Sounds
let moleSound;
let plantSound;
let gameOverSound;
let themeSound;

// Store Interval IDs
let moleInterval;
let plantInterval;

window.onload = function () {
    preloadSounds();
    setGame();
    playThemeMusic();
};

// Preload sounds
function preloadSounds() {
    moleSound = new Audio("audio/pop.mp3");
    plantSound = new Audio("audio/monty.mp3");
    gameOverSound = new Audio("audio/gameover.mp3");
    themeSound = new Audio("audio/reactiontheme.mp3");

    themeSound.loop = true;  // Loop theme music
    themeSound.volume = 0.5; // Adjust volume
}

// Function to play theme music
function playThemeMusic() {
    themeSound.currentTime = 0;  // Restart music from the beginning
    themeSound.play().catch(error => console.log("Autoplay blocked:", error));
}

// Function to stop theme music
function stopThemeMusic() {
    themeSound.pause();
    themeSound.currentTime = 0;
}

function setGame() {
    document.getElementById("board").innerHTML = ""; // Clear board on restart
    score = 0;
    gameOver = false;
    document.getElementById("score").innerText = score.toString(); // Reset score

    for (let i = 0; i < 9; i++) {
        let tile = document.createElement("div");
        tile.id = i.toString();
        tile.addEventListener("click", selectTile);
        document.getElementById("board").appendChild(tile);
    }

    // **Clear old intervals before setting new ones**
    clearInterval(moleInterval);
    clearInterval(plantInterval);

    // **Start new intervals for Mole and Plant**
    moleInterval = setInterval(setMole, 1000);  // Monty every 1 sec
    plantInterval = setInterval(setPlant, 2000); // Piranha every 2 sec

    playThemeMusic(); // Restart theme music when game starts
}

function getRandomTile() {
    let num = Math.floor(Math.random() * 9);
    return num.toString();
}

function setMole() {
    if (gameOver) return;
    if (currMoleTile) currMoleTile.innerHTML = ""; // Clear previous mole

    let mole = document.createElement("img");
    mole.src = "./monty-mole.png";

    let num = getRandomTile();
    if (currPlantTile && currPlantTile.id == num) return; // Avoid overlap
    currMoleTile = document.getElementById(num);
    currMoleTile.appendChild(mole);
}

function setPlant() {
    if (gameOver) return;
    if (currPlantTile) currPlantTile.innerHTML = ""; // Clear previous plant

    let plant = document.createElement("img");
    plant.src = "./piranha-plant.png";

    let num = getRandomTile();
    if (currMoleTile && currMoleTile.id == num) return; // Avoid overlap
    currPlantTile = document.getElementById(num);
    currPlantTile.appendChild(plant);
}

function selectTile() {
    if (gameOver) return;

    if (this == currMoleTile) {
        score += 10;
        document.getElementById("score").innerText = score.toString();
        moleSound.play();
    } 
    else if (this == currPlantTile) {
        document.getElementById("score").innerText = "GAME OVER: " + score.toString();
        gameOver = true;
        plantSound.play();
        gameOverSound.play();
        stopThemeMusic();

        // **Stop game timers when game over**
        clearInterval(moleInterval);
        clearInterval(plantInterval);

        // Show Restart Button
        let restartBtn = document.createElement("button");
        restartBtn.innerText = "Restart Game";
        restartBtn.onclick = restartGame;
        document.body.appendChild(restartBtn);
    }
}

// Function to restart the game
function restartGame() {
    document.querySelector("button").remove(); // Remove Restart Button
    setGame(); // Restart Game
}
