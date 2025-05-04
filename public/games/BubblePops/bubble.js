const BP = {
    ui: {
      progressElm: document.querySelector(".progress"),
      introElm: document.querySelector(".intro"),
      levelsElm: document.querySelector(".levels"),
      levelMsg: document.querySelector(".levels").firstElementChild,
      startBtn: document.querySelector(".start"),
      canvas: document.getElementById("canvas"),
      canvasWrapper: document.getElementById("canvas-wrapper"),
      size: function () {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      },
      loadSounds: function () {
        // Load sound files (adjust paths if necessary)
        const sounds = {
          high: new Audio("../BubblePops/high.mp3"),
          med: new Audio("../BubblePops/med.mp3"),
          low: new Audio("../BubblePops/low.mp3")
        };
        // Set volume for each sound
        Object.values(sounds).forEach((sound) => {
          sound.volume = 0.25;
        });
        return sounds;
      },
      // This property will hold our cached sound objects.
      sounds: null,
      ctx: document.getElementById("canvas").getContext("2d"),
      mouse: {
        x: undefined,
        y: undefined
      }
    },
  
    util: {
      fadeIn: function (elem, ms) {
        if (!elem) return;
        elem.style.opacity = 0;
        elem.style.display = "inline-block";
        elem.style.visibility = "visible";
        if (ms) {
          let opacity = 0;
          const timer = setInterval(function () {
            opacity += 50 / ms;
            if (opacity >= 1) {
              clearInterval(timer);
              opacity = 1;
            }
            elem.style.opacity = opacity;
          }, 50);
        } else {
          elem.style.opacity = 1;
        }
      },
      fadeOut: function (elem, ms) {
        if (!elem) return;
        if (ms) {
          let opacity = 1;
          const timer = setInterval(function () {
            opacity -= 50 / ms;
            if (opacity <= 0) {
              clearInterval(timer);
              opacity = 0;
              elem.style.display = "none";
              elem.style.visibility = "hidden";
            }
            elem.style.opacity = opacity;
          }, 50);
        } else {
          elem.style.opacity = 0;
          elem.style.display = "none";
          elem.style.visibility = "hidden";
        }
      },
      randomColorGen: function () {
        let r = Math.floor(Math.random() * 255) + 1;
        let g = Math.floor(Math.random() * 255) + 1;
        let b = Math.floor(Math.random() * 255) + 1;
        return `${r}, ${g}, ${b}`;
      }
    },
  
    bubblesQueue: [],
  
    bubble: function (x, y, dx, dy, radius, colors) {
      this.x = x;
      this.y = y;
      this.dx = dx;
      this.dy = dy;
      this.origRadius = radius;
      this.radius = radius;
      this.minRadius = radius;
      this.colors = colors;
  
      this.draw = function () {
        BP.ui.ctx.beginPath();
        BP.ui.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        BP.ui.ctx.fillStyle = colors;
        BP.ui.ctx.fill();
      };
  
      this.update = function () {
        // Boundary detection
        if (this.x + this.radius > innerWidth || this.x - this.radius < 0) {
          this.dx = -this.dx;
        }
        if (this.y + this.radius > innerHeight || this.y - this.radius < 0) {
          this.dy = -this.dy;
        }
        this.x += this.dx;
        this.y += this.dy;
  
        // Enlarge bubble when mouse is nearby
        if (
          BP.ui.mouse.x - this.x < this.radius &&
          BP.ui.mouse.x - this.x > -this.radius &&
          BP.ui.mouse.y - this.y < this.radius &&
          BP.ui.mouse.y - this.y > -this.radius &&
          this.radius !== 0
        ) {
          this.radius += BP.gamePlay.bubbleExpansionRate;
          if (this.radius > BP.gamePlay.maxExpansion) {
            this.destroy(this.origRadius);
          }
        } else if (this.radius > this.minRadius && this.radius !== 0) {
          this.radius -= BP.gamePlay.bubbleExpansionRate;
          BP.ui.mouse.x = 0;
          BP.ui.mouse.y = 0;
        }
        this.draw();
      };
  
      // Pop the bubble, play a sound, and update game progress
      this.destroy = function (origRadius) {
        BP.gamePlay.playSound(origRadius);
        this.radius = 0;
        this.x = -10;
        this.y = -10;
        this.dx = 0;
        this.dy = 0;
        BP.gamePlay.bubblesPoppedPerLevel += 1;
        BP.gamePlay.bubblesPoppedTotal += 1;
        BP.gamePlay.checkProgress();
      };
    },
  
    bubbleMultiplier: function () {
      this.bubblesQueue = [];
      // Calculate how many bubbles to create based on the current level
      let bubbleNums = BP.gamePlay.bubbleQnty - BP.gamePlay.bubblesPoppedPerLevel;
      for (let i = 0; i < bubbleNums; i++) {
        let radius = Math.floor(Math.random() * BP.gamePlay.maxRadius) + 25;
        let x = Math.random() * (innerWidth - radius * 2) + radius;
        let y = Math.random() * (innerHeight - radius * 2) + radius;
        let dx = (Math.random() - 0.5) * BP.gamePlay.speed;
        let dy = (Math.random() - 0.5) * BP.gamePlay.speed;
        let a = Math.random() * (1 - 0.15) + 0.15;
        let colors = `rgba(${BP.util.randomColorGen()}, ${a})`;
        this.bubblesQueue.push(new BP.bubble(x, y, dx, dy, radius, colors));
      }
    },
  
    animate: function () {
      requestAnimationFrame(BP.animate);
      BP.ui.ctx.clearRect(0, 0, innerWidth, innerHeight);
      BP.bubblesQueue.forEach(function (bubble) {
        bubble.update();
      });
    },
  
    gamePlay: {
      level: 0,
      bubbleQnty: 50,
      bubblesPoppedPerLevel: 0,
      bubblesPoppedTotal: 0,
      bubbleExpansionRate: 5,
      speed: 8,
      maxRadius: 45,
      maxExpansion: 150,
      setMouseCoords: function (event) {
        BP.ui.mouse.x = event.x;
        BP.ui.mouse.y = event.y;
      },
      start: function () {
        BP.gamePlay.level = 1;
        BP.ui.canvasWrapper.addEventListener(
          "mousemove",
          function (event) {
            event.preventDefault();
            event.stopPropagation();
            BP.gamePlay.setMouseCoords(event);
          },
          false
        );
        BP.ui.canvasWrapper.addEventListener(
          "click",
          function (event) {
            event.preventDefault();
            event.stopPropagation();
            BP.gamePlay.setMouseCoords(event);
          },
          false
        );
        BP.gamePlay.speed = 3;
        BP.gamePlay.bubbleQnty = 8;
        BP.ui.canvas.classList.add("active");
        BP.util.fadeOut(BP.ui.introElm, 200);
        BP.bubbleMultiplier();
        BP.gamePlay.stopwatch.startTimer();
      },
      stopwatch: {
        startTime: null,
        endTime: null,
        duration: 0,
        startTimer: function () {
          this.startTime = new Date();
        },
        stopTimer: function () {
          this.endTime = new Date();
        },
        resetTimer: function () {
          this.startTime = null;
          this.endTime = null;
          this.duration = 0;
        },
        showDuration: function () {
          let time = (this.endTime.getTime() - this.startTime.getTime()) / 1000;
          const secs = parseInt(time, 10);
          let minutes = Math.floor(secs / 60);
          let seconds = secs - minutes * 60;
          if (minutes > 0) {
            let onesPlace = seconds < 10 ? "0" : "";
            return `${minutes}:${onesPlace}${seconds}!`;
          } else {
            return `${seconds} seconds!`;
          }
        }
      },
      checkProgress: function () {
        if (this.bubblesPoppedPerLevel === this.bubbleQnty) {
          BP.gamePlay.stopwatch.stopTimer();
          BP.gamePlay.level += 1;
          BP.ui.canvas.classList.remove("active");
          BP.gamePlay.showHideLevelMsg();
        }
      },
      showHideLevelMsg: function () {
        BP.ui.progressElm.innerHTML = `${this.bubblesPoppedPerLevel} bubbles popped in ${BP.gamePlay.stopwatch.showDuration()}`;
        this.bubblesPoppedPerLevel = 0;
        BP.gamePlay.stopwatch.resetTimer();
  
        let color = `color:rgba(${BP.util.randomColorGen()}, 1)`;
        BP.ui.levelMsg.setAttribute("style", color);
        BP.ui.levelMsg.innerHTML = `Level ${BP.gamePlay.level}`;
  
        setTimeout(() => {
          BP.util.fadeIn(BP.ui.progressElm, 800);
          setTimeout(() => {
            BP.util.fadeOut(BP.ui.progressElm, 600);
          }, 4800);
        }, 200);
  
        setTimeout(() => {
          BP.util.fadeIn(BP.ui.levelsElm, 800);
          setTimeout(() => {
            BP.util.fadeOut(BP.ui.levelsElm, 600);
            BP.gamePlay.nextLevel();
          }, 3000);
        }, 2000);
      },
      nextLevel: function () {
        BP.gamePlay.speed += 0.5;
        BP.gamePlay.bubbleQnty += 5;
        if (BP.gamePlay.maxRadius + 15 < BP.gamePlay.maxExpansion) {
          BP.gamePlay.maxExpansion -= 5;
        }
        setTimeout(() => {
          BP.bubbleMultiplier();
          BP.ui.canvas.classList.add("active");
          BP.gamePlay.stopwatch.startTimer();
        }, 800);
      },
      playSound: function (origRadius) {
        // Use cached sounds from BP.ui.sounds
        let sound = null;
        if (!BP.ui.sounds) {
          // In case sounds were not loaded, load them now.
          BP.ui.sounds = BP.ui.loadSounds();
        }
        if (origRadius <= 34) {
          sound = BP.ui.sounds.high;
        } else if (origRadius > 34 && origRadius <= 42) {
          sound = BP.ui.sounds.med;
        } else {
          sound = BP.ui.sounds.low;
        }
        // Play the sound
        if (sound) {
          // Reset playback to start in case it's already playing
          sound.currentTime = 0;
          sound.play();
        }
      }
    },
  
    bind: function () {
      this.ui.startBtn.addEventListener("click", this.gamePlay.start);
      window.addEventListener("resize", function () {
        BP.ui.canvas.width = window.innerWidth;
        BP.ui.canvas.height = window.innerHeight;
        if (BP.gamePlay.bubblesPoppedPerLevel !== 0 || BP.gamePlay.level === 0) {
          BP.bubbleMultiplier();
        }
      });
    },
  
    init: function () {
      this.ui.size();
      // Cache sounds once during initialization
      this.ui.sounds = this.ui.loadSounds();
      this.bubbleMultiplier();
      this.animate();
      this.bind();
    }
  };
  
  BP.init();
  