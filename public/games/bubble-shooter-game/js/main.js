// All coordinates in vh because the game fits vertically.
// Horizantical and vertical should be in the same units
// since they can match the coordinates system.
// Bubble raduis is 3, distance between two bubbles' center is 6. 
// Using Pythagorean theorem 27 = 6**2 - 3**2 
const verticalStep = Math.sqrt(27);
const radius = 3;
const boardWidth = 60;
const boardHeight = 90;
const levelThreshold = 1000; //for demo purposes it is kept low.

class Game {
    constructor(){
        this.board = document.getElementById('board');
        this.bubble = null;
        this.bubbles = [];
        this.width = boardWidth;
        this.height = boardHeight;
        this.bubbleRadius = radius;
        this.bubbleDiameter = 2*radius;
        this.velocity = 1;
        this.velocityX = 0;
        this.velocityY = 0;
        this.score = 0;
        this.yippieSound = new Audio('./resources/audios/yippee-sound.mp3');
        this.gameBackgroundSound = new Audio('./resources/audios/game-background-audio.mp3');
        this.gameBackgroundSound.loop = true;
        this.gameOverSound = new Audio('./resources/audios/gameover-audio.mp3');
        this.musicOn = true;
        this.minClusterSize = 3;
        this.levelThreshold = levelThreshold;

        this.start();
        this.attachEventListeners();
        this.updateScore();
        this.showMessage('Start');
        this.addSoundOn();
        this.addSoundOff();
    }

    start(){
        let y = this.height - this.bubbleRadius;
        for (let i = 0; i < 8; i++) {
            let a = this.bubbleRadius;
            if (i % 2 !== 0) {
                a = this.bubbleDiameter;
            } 
            for (let x = a; x < this.width; x += this.bubbleDiameter) {
                this.bubbles.push(new Bubble(x, y));
            }
            y -= verticalStep;
        }
        this.newActiveBubble();
        this.updateScore();
    }


    moveBubble() {
        let stopped = false
        // border collusion
        if(this.bubble.positionX + this.velocityX > this.width - this.bubbleRadius
            || this.bubble.positionX + this.velocityX < this.bubbleRadius) {
            this.velocityX = -this.velocityX;
        }
        if(this.bubble.positionY + this.velocityY < this.bubbleRadius) {
            this.velocityY = -this.velocityY;
        }
        if (this.bubble.positionY + this.velocityY > this.height - this.bubbleRadius){
            this.velocityX = 0;
            this.velocityY = 0;
            this.bubble.positionY = this.height - this.bubbleRadius;
            // x=3+6*n top line positioning fix 
            this.bubble.positionX = Math.round((this.bubble.positionX - this.bubbleRadius) / this.bubbleDiameter) * this.bubbleDiameter + this.bubbleRadius; 
            stopped = true;
        }

        // bubble to bubble collusion
        const closestBubbles = [];
        for (let i = 0; i < this.bubbles.length; i++) {
            if ( this.bubbles[i].willCollide(this.bubble, this.velocityX, this.velocityY) !== false) {
                closestBubbles.push(this.bubbles[i]);
            }
        }

        if(closestBubbles.length > 0) {
            this.velocityX = 0;
            this.velocityY = 0;
            const locations = this.bubble.closestLocation(closestBubbles).getPossibleLocations();
            const bestLocation = this.bubble.closestLocation(locations);
            this.bubble.positionX = bestLocation.positionX;
            this.bubble.positionY = bestLocation.positionY;
            stopped = true;  
        }


        // move if no collusion
        this.bubble.moveBy(this.velocityX, this.velocityY);
        if (stopped) {
            this.bubbleStick();
        }
    }
    // when the active bubble hits other bubbles or borders
    bubbleStick() {
        clearInterval(this.intervalId);

        this.bubbles.push(this.bubble);
        this.findClustersAndRemoveBubbles();

        let minPositionY = this.height - this.bubbleRadius;
        for (let i = 0; i < this.bubbles.length; i++) {
            if (this.bubbles[i].positionY < minPositionY) {
                minPositionY = this.bubbles[i].positionY;
            }
        }
        if (minPositionY < this.height - this.bubbleDiameter - (12 * verticalStep)) {
            this.gameOver();
        }

        if (this.score >= this.levelThreshold) {
            this.showMessage('Next');
        }

        setTimeout(() => {  
            this.newActiveBubble();
        }, 1000);   
    }

    newActiveBubble() {
        this.bubble = new Bubble(this.width/2, 10);
        this.bubble.startShaking();
    }
    
    attachEventListeners(){
        this.board.addEventListener('click', (event) => {


            if(this.bubble.actionComplete === false) {
                this.bubble.actionComplete = true;
                const velocityPixelX = event.clientX - this.bubble.getCenterX();
                const velocityPixelY = -(event.clientY - this.bubble.getCenterY());
                
                const diagonalPixel = Math.sqrt(Math.pow(velocityPixelX, 2) + Math.pow(velocityPixelY, 2));
                const moveRatio = this.velocity / diagonalPixel;
                this.velocityX = velocityPixelX * moveRatio;
                this.velocityY = velocityPixelY * moveRatio;
                
                this.intervalId = setInterval(() => {
                    this.moveBubble();   
                }, 20);
        

                this.bubble.stopShaking();
            }   
        });
    }

    // it checks when the bubble stick if it has neighbors and they have the same color
    addBubblesToConnectedCluster(aBubble, clusterArr, checkColor) {
        const newMemberArr = [];
        
        clusterArr.push(aBubble);
        newMemberArr.push(aBubble);

        while (newMemberArr.length > 0) {
            const element = newMemberArr.shift();
            
            for (let i = 0; i < this.bubbles.length; i++) {
                if(element.isNeighbor(this.bubbles[i]) === true
                    && (checkColor === false || element.isSameColor(this.bubbles[i]) === true)) {
                    if (clusterArr.indexOf(this.bubbles[i]) === -1) {
                        clusterArr.push(this.bubbles[i]);
                        newMemberArr.push(this.bubbles[i]);
                    }
                }
            }
        }
        return clusterArr;
    }

    getTopLine() {
        const topLine = this.bubbles.filter(bubble => bubble.positionY === this.height - this.bubbleRadius);
        return topLine;
    }

    findAllConnectedBubbles() {
        const clusterArr = [];
        const checkColor = false;
        this.getTopLine().forEach(element => {
            this.addBubblesToConnectedCluster(element, clusterArr, checkColor)
        });
        return clusterArr;
    }

    // it checks the unconnected bubbles in the board
    removeUnconnectedBubbles() {
        const connectedBubbles = this.findAllConnectedBubbles()
        const unconnectedBubbles = this.bubbles.filter(bubble => connectedBubbles.indexOf(bubble) === -1);
        for(let i = 0; i < unconnectedBubbles.length; i++) {
            this.removeBubble(unconnectedBubbles[i]);
        }
    }

    findClustersAndRemoveBubbles() {
        const clusterArr = [];
        this.addBubblesToConnectedCluster(this.bubble, clusterArr, true);

        if (clusterArr.length >= this.minClusterSize) {
            this.yippieSound.play();
            // score is related connected cluster size's square
            this.score += Math.pow(clusterArr.length, 2) * 10;
            this.updateScore();
            for(let i = 0; i < clusterArr.length; i++) {
                this.removeBubble(clusterArr[i]);
            }
            this.removeUnconnectedBubbles();
        }  
    }

    removeBubble(aBubble){
        const index = this.bubbles.indexOf(aBubble);
        if (index > -1) {
            this.bubbles.splice(index, 1); 

            aBubble.scaleOutAndDelete();
        }
    }

    removeActiveBubble() {
        this.bubble.scaleOutAndDelete();
    }

    updateScore(){
        const signBoard = document.getElementById("sign-board");
        signBoard.innerHTML = `<p>SCORE: ${this.score}</p> <p>Connect min ${this.minClusterSize}</p>`;
    }

    showMessage(state) {
        const messageBox = document.getElementById('message-box');
        const messageBoard = document.createElement('div');
        messageBoard.className = 'message-board';
        messageBox.appendChild(messageBoard);
        if(state === 'Game Over') {
            const messageText = document.createElement('p');
            messageText.innerText = 'GAME OVER';
            messageBoard.appendChild(messageText);
            const gameButton = document.createElement('button');
            gameButton.classList.add('restart-button', 'game-button');
            messageBoard.appendChild(gameButton);
            gameButton.addEventListener('click', (event) => {
                this.restart();
                event.stopPropagation();
            });
        } else if (state === 'Start') {
            const messageText = document.createElement('p');
            messageText.innerText = "Furry Bubble Shooter";
            messageBoard.appendChild(messageText);
            const gameButton = document.createElement('button');
            gameButton.classList.add('play-button', 'game-button');
            messageBoard.appendChild(gameButton);
            gameButton.addEventListener('click', (event) => {
                this.restart();
                event.stopPropagation();
            });
        } else if (state === 'Next') {
            const messageText = document.createElement('p');
            messageText.innerText = "NEXT LEVEL";
            messageBoard.appendChild(messageText);
            const gameButton = document.createElement('button');
            gameButton.classList.add('next-button', 'game-button');
            messageBoard.appendChild(gameButton);
            gameButton.addEventListener('click', (event) => {
                this.nextLevel();
                event.stopPropagation();
            });
        }
        
        messageBox.style.width = '100%';
        messageBox.style.height = '100%';
    }

    hideMessage() {
        const messageBox = document.getElementById('message-box');
        messageBox.style.width = 0;
        messageBox.style.height = 0;
        while (messageBox.firstChild) {
            messageBox.removeChild(messageBox.lastChild);
        }
    }

    gameOver() { 
        this.showMessage('Game Over')
        this.stopMusic();
        this.gameOverSound.play();
    }

    restart() {
        this.playMusic();
        this.hideMessage();
        this.score = 0;
        this.minClusterSize = 3;
        this.bubbles.forEach(aBubble => aBubble.deleteDomElement());
        this.bubbles.splice(0, this.bubbles.length);
        this.removeActiveBubble();
        this.start();
    }

    nextLevel() {
        this.hideMessage();
        this.score = 0;
        this.minClusterSize += 1;
        this.bubbles.forEach(aBubble => aBubble.deleteDomElement());
        this.bubbles.splice(0, this.bubbles.length);
        this.removeActiveBubble();
        this.start();
    }

    addSoundOn() {
        const soundOnButton = document.getElementById("sound-on-button");
        soundOnButton.classList.add('music-button');
        soundOnButton.addEventListener('click', (event) => {
           this.musicOn = true;
           this.playMusic();
           event.stopPropagation();
        });
    }

    addSoundOff() {
        const soundOffButton = document.getElementById("sound-off-button");
        soundOffButton.classList.add('music-button');
        soundOffButton.addEventListener('click', (event) => {
            this.musicOn = false;
            this.stopMusic();
            event.stopPropagation();
        });
    }

    playMusic() {
       if (this.musicOn) {
        this.gameBackgroundSound.play();
       } 
    }

    stopMusic() {
        this.gameBackgroundSound.pause();
        this.gameBackgroundSound.currentTime = 0;
    }
}



class Bubble {
    constructor(positionX, positionY){
        this.height = 2*radius;
        this.width = 2*radius;
        this.bubbleRadius = radius;
        this.bubbleDiameter = 2*radius;
        this.positionX = positionX;
        this.positionY = positionY;
        this.actionComplete = false;

        const bubbleColorArr = ['bubble-pink', 'bubble-green', 'bubble-yellow', 'bubble-blue'];
        this.color = bubbleColorArr[Math.floor(Math.random()*bubbleColorArr.length)];

        this.domElement = null;
        this.createDomElement();
    }

    createDomElement(){
        this.domElement = document.createElement("div");

        this.domElement.classList.add(this.color, 'bubble');

        this.domElement.style.left = (this.positionX - (this.width / 2)) + "vh"
        this.domElement.style.bottom = (this.positionY - (this.height / 2))+ "vh"
        this.domElement.style.height = this.height + "vh";
        this.domElement.style.width = this.width + "vh";

        this.addEyes();
        const boardElm = document.getElementById("board");
        boardElm.appendChild(this.domElement);
    }

    deleteDomElement() {
        const board = document.getElementById("board");
        board.removeChild(this.domElement);
    }

    scaleOutAndDelete() {
        this.domElement.style.animationName= 'scale-out';
        this.domElement.style.animationDuration= '1s';
        this.domElement.style.animationFillMode = 'forwards';
        setTimeout(() => {
            this.deleteDomElement();
        }, 1000);
    }

    getCenterX() {
        let viewportOffset = this.domElement.getBoundingClientRect();
        let centerX = viewportOffset.left + viewportOffset.width / 2;
        return centerX;    
    }

    getCenterY() {
        let viewportOffset = this.domElement.getBoundingClientRect();
        let centerY = viewportOffset.top + viewportOffset.height / 2;
        return centerY;
    }

    // A bubble can stick only specific locations that relative its neighbors.
    // This function generate the relative locations.
    getPossibleLocations() {
        const locationsArr = [];
        locationsArr.push({positionX:this.positionX + this.bubbleRadius, positionY:this.positionY - verticalStep});
        locationsArr.push({positionX:this.positionX - this.bubbleRadius, positionY:this.positionY - verticalStep});
        locationsArr.push({positionX:this.positionX + this.bubbleDiameter, positionY:this.positionY});
        locationsArr.push({positionX:this.positionX - this.bubbleDiameter, positionY:this.positionY});
        locationsArr.push({positionX:this.positionX + this.bubbleRadius, positionY:this.positionY + verticalStep});
        locationsArr.push({positionX:this.positionX - this.bubbleRadius, positionY:this.positionY + verticalStep});
        
        const locationsInBoard = locationsArr.filter(location =>
            0 < location.positionX && location.positionX < boardWidth
            && 0 < location.positionY && location.positionY < boardHeight)
        return locationsInBoard;
    }

    distanceTo(x, y) {
        return Math.sqrt(Math.pow((this.positionX - x), 2) + Math.pow((this.positionY - y), 2));
    }

    closestLocation(locations) {
        let location = locations[0];
        let minDistance = this.distanceTo(locations[0].positionX, locations[0].positionY);
        for (let i = 0; i < locations.length; i++) {
            const distance =  this.distanceTo(locations[i].positionX, locations[i].positionY);
            
            if ( distance < minDistance) {
                minDistance = distance;
                location = locations[i];
            }
        }
        return location;
    }

    willCollide(otherBubble, velocityX, velocityY) {
        const centerX = this.positionX;
        const centerY = this.positionY;
        const otherCenterX = otherBubble.positionX + velocityX; 
        const otherCenterY = otherBubble.positionY + velocityY;
        const distance = Math.sqrt(Math.pow((centerX - otherCenterX), 2) + Math.pow((centerY - otherCenterY), 2));
        if (distance <= this.bubbleDiameter) {
            return true;
        }
        return false;
    }

    isNeighbor(otherBubble) {
        if (this.bubble === otherBubble) {
            return false;
        }
        return this.willCollide(otherBubble, 0, 0);   
    }

    isSameColor(otherBubble){
        if(this.color === otherBubble.color) {
            return true;
        }
        return false;
    }

    moveBy(velocityX, velocityY){
        this.positionX += velocityX;
        this.positionY += velocityY;
        this.domElement.style.left = (this.positionX - (this.width / 2)) + "vh"
        this.domElement.style.bottom = (this.positionY - (this.height / 2))+ "vh"
    }

    startShaking() {
        this.domElement.style.animationName = 'shake';
        this.domElement.style.animationDuration = '0.3s';
        this.domElement.style.animationIterationCount = 'infinite';
    }

    stopShaking() {
        this.domElement.style.animationName = 'scale-half';
        this.domElement.style.animationFillMode = 'forwards';
        this.domElement.style.animationDuration = '0.5s';
        this.domElement.style.animationIterationCount = 1;
    }

    addEyes() {
        const eyesWrapper = document.createElement("div");
        eyesWrapper.className = "eyes-wrap";
        const leftEye = document.createElement("div");
        const rightEye = document.createElement("div");

        const eyeMove = ["blink", "double-blink", "grin", "sad", "up", "down"];
        const randomEyeMove = eyeMove[Math.floor(Math.random() * eyeMove.length)];
        leftEye.classList.add("eye", randomEyeMove);
        rightEye.classList.add("eye", randomEyeMove);
        this.domElement.appendChild(eyesWrapper);
        eyesWrapper.appendChild(leftEye);
        eyesWrapper.appendChild(rightEye);
    }

}

const game = new Game();