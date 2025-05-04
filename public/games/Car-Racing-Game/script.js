import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

let scene, camera, renderer, carModel, enemyCar;
let ambientLight, directionalLight;
let road,
  roadLines = [],
  kerbs = [];
let buildings = [],
  streetLights = [],
  trafficLights = [];
const roadWidth = 10;
const roadLength = 200;
const buildingSpacing = 15;
const lightSpacing = 30;
const numBuildings = Math.floor(roadLength / buildingSpacing);
const numLights = Math.floor(roadLength / lightSpacing);

const enemyRelativeSpeed = 0.1;

const kerbHeight = 0.2;
const kerbWidth = 0.3;

let moveLeft = false;
let moveRight = false;
const carMoveSpeed = 0.15;
let carBaseY = 0;
let score = 0;
let isGameOver = false;

let accelerate = false;
let brake = false;
const baseDriveSpeed = 0.5;
const maxSpeed = 1.2;
const minSpeed = 0.1;
const accelerationRate = 0.015;
const brakingRate = 0.03;
const friction = 0.005;
let currentDriveSpeed = baseDriveSpeed;

// --- Points ---
const points = [];
const numPoints = 15;
const pointValue = 10;
let pointGeometry, pointMaterial;
const pointRadius = 0.3;

// --- UI Elements References ---
const loadingScreen = document.getElementById("loading-screen");
const scoreElement = document.getElementById("score");
const gameOverElement = document.getElementById("game-over");
const speedIndicatorElement = document.getElementById("speed-indicator");

// --- Audio Elements ---
const engineSound = document.getElementById("engine-sound");
const brakeSound = document.getElementById("brake-sound");
const crashSound = document.getElementById("crash-sound");
let wasBraking = false;

// --- Bounding Boxes ---
let playerBox = new THREE.Box3();
let enemyBox = new THREE.Box3();
let pointBox = new THREE.Box3();

// --- Texture Loader ---
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);

// Loading Manager Callbacks
loadingManager.onLoad = () => {
  console.log("All resources loaded!");
  loadingScreen.classList.add("hidden");
  setTimeout(() => {
    if (loadingScreen) loadingScreen.style.display = "none";
  }, 600);
};
loadingManager.onError = (url) => {
  console.error(`There was an error loading ${url}`);
  loadingScreen.textContent = `Error loading: ${url}. Check console.`;
  loadingScreen.classList.remove("hidden");
  loadingScreen.style.opacity = 1;
};
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
  const progress = Math.round((itemsLoaded / itemsTotal) * 100);
  loadingScreen.textContent = `Loading ${progress}%...`;
};

init();
setupControls();
animate();

function init() {
  // --- Basic Setup ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0d7e6);
  scene.fog = new THREE.Fog(0xa0d7e6, roadLength * 0.4, roadLength * 0.9);
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.getElementById("container").appendChild(renderer.domElement);

  // --- Lights ---
  ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -roadLength / 2;
  directionalLight.shadow.camera.right = roadLength / 2;
  directionalLight.shadow.camera.top = roadLength / 2;
  directionalLight.shadow.camera.bottom = -roadLength / 2;
  scene.add(directionalLight);

  // --- Ground (Grass) ---
  const groundGeo = new THREE.PlaneGeometry(roadLength * 1.5, roadLength);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x55aa55,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Road with Texture ---
  const roadTexture = textureLoader.load("textures/road_asphalt.jpg");
  roadTexture.wrapS = THREE.RepeatWrapping;
  roadTexture.wrapT = THREE.RepeatWrapping;
  const roadRepeatX = 2;
  const roadRepeatY = roadLength / 10;
  roadTexture.repeat.set(roadRepeatX, roadRepeatY);

  const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTexture,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1,
  });
  road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.0;
  road.receiveShadow = true;
  scene.add(road);

  // --- Road Lines ---
  const lineLength = 4;
  const lineGap = 4;
  const numLines = Math.floor(roadLength / (lineLength + lineGap));
  const lineGeo = new THREE.PlaneGeometry(0.3, lineLength);
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < numLines; i++) {
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.005;
    line.position.z =
      roadLength / 2 - lineLength / 2 - i * (lineLength + lineGap);
    line.receiveShadow = true;
    roadLines.push(line);
    scene.add(line);
  }

  // --- Kerbs with Texture ---
  const kerbTexture = textureLoader.load("textures/kerb_concrete.jpg");
  kerbTexture.wrapS = THREE.RepeatWrapping;
  kerbTexture.wrapT = THREE.RepeatWrapping;
  const kerbRepeatX = roadLength / 2;
  kerbTexture.repeat.set(kerbRepeatX, 1);

  const kerbGeo = new THREE.BoxGeometry(kerbWidth, kerbHeight, roadLength);
  const kerbMat = new THREE.MeshStandardMaterial({
    map: kerbTexture,
    roughness: 0.9,
    metalness: 0.05,
  });
  const kerbLeft = new THREE.Mesh(kerbGeo, kerbMat);
  kerbLeft.position.set(-(roadWidth / 2) - kerbWidth / 2, kerbHeight / 2, 0);
  kerbLeft.castShadow = true;
  kerbLeft.receiveShadow = true;
  scene.add(kerbLeft);
  kerbs.push(kerbLeft);
  const kerbRight = new THREE.Mesh(kerbGeo, kerbMat);
  kerbRight.position.set(roadWidth / 2 + kerbWidth / 2, kerbHeight / 2, 0);
  kerbRight.castShadow = true;
  kerbRight.receiveShadow = true;
  scene.add(kerbRight);
  kerbs.push(kerbRight);

  // --- Enhanced Buildings ---
  const buildingColorPalettes = [
    { facade: "#a9a9a9", window: "#444466" },
    { facade: "#d2b48c", window: "#3b2f2f" },
    { facade: "#f5f5dc", window: "#556b2f" },
    { facade: "#b0c4de", window: "#2e4053" },
    { facade: "#ffe4c4", window: "#704214" },
  ];

  function createBuildingTexture(palette, width, height) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 512;

    ctx.fillStyle = palette.facade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const windowColor = palette.window;
    const numFloors = Math.floor(height / 4);
    const numWindowsAcross = Math.floor(width / 3);

    const windowHeight = (canvas.height / (numFloors + 1)) * 0.6;
    const windowWidth = (canvas.width / (numWindowsAcross + 1)) * 0.6;
    const gapY = (canvas.height - numFloors * windowHeight) / (numFloors + 1);
    const gapX =
      (canvas.width - numWindowsAcross * windowWidth) / (numWindowsAcross + 1);

    ctx.fillStyle = windowColor;
    for (let r = 0; r < numFloors; r++) {
      for (let c = 0; c < numWindowsAcross; c++) {
        const x =
          gapX + c * (windowWidth + gapX) + (Math.random() - 0.5) * gapX * 0.2;
        const y =
          gapY + r * (windowHeight + gapY) + (Math.random() - 0.5) * gapY * 0.2;
        const w = windowWidth * (0.9 + Math.random() * 0.2);
        const h = windowHeight * (0.9 + Math.random() * 0.2);
        if (x > 0 && y > 0 && x + w < canvas.width && y + h < canvas.height) {
          ctx.fillRect(x, y, w, h);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function createBuilding() {
    const height = Math.random() * 30 + 10;
    const width = Math.random() * 8 + 4;
    const depth = Math.random() * 8 + 4;

    const palette =
      buildingColorPalettes[
        Math.floor(Math.random() * buildingColorPalettes.length)
      ];
    const buildingTexture = createBuildingTexture(palette, width, height);

    const buildingGeo = new THREE.BoxGeometry(width, height, depth);
    const buildingMat = new THREE.MeshStandardMaterial({
      map: buildingTexture,
      roughness: 0.7 + Math.random() * 0.2,
      metalness: 0.1 + Math.random() * 0.1,
    });

    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = height / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    return building;
  }

  for (let i = 0; i < numBuildings; i++) {
    const buildingLeft = createBuilding();
    const buildingRight = createBuilding();
    const zPos = roadLength / 2 - buildingSpacing / 2 - i * buildingSpacing;
    const xOffsetLeft =
      roadWidth / 2 +
      kerbWidth +
      1 +
      Math.random() * 3 +
      buildingLeft.geometry.parameters.width / 2;
    const xOffsetRight =
      roadWidth / 2 +
      kerbWidth +
      1 +
      Math.random() * 3 +
      buildingRight.geometry.parameters.width / 2;
    buildingLeft.position.set(-xOffsetLeft, buildingLeft.position.y, zPos);
    buildingRight.position.set(xOffsetRight, buildingRight.position.y, zPos);
    buildings.push(buildingLeft, buildingRight);
    scene.add(buildingLeft);
    scene.add(buildingRight);
  }

  // --- Street Lights & Traffic Lights ---
  function createStreetLight() {
    const group = new THREE.Group();
    const poleHeight = 6;
    const poleRadius = 0.1;
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.4,
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.castShadow = true;
    pole.position.y = poleHeight / 2;
    group.add(pole);
    const armLength = 1;
    const armGeo = new THREE.BoxGeometry(
      armLength,
      poleRadius * 1.5,
      poleRadius * 1.5
    );
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0, poleHeight - poleRadius * 2, 0);
    group.add(arm);
    const lightFixtureGeo = new THREE.SphereGeometry(poleRadius * 2, 16, 8);
    const lightFixtureMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
    });
    const lightFixture = new THREE.Mesh(lightFixtureGeo, lightFixtureMat);
    lightFixture.position.set(0, poleHeight - poleRadius * 2, 0);
    group.add(lightFixture);
    group.userData.armLength = armLength;
    return group;
  }
  for (let i = 0; i < numLights; i++) {
    const lightLeft = createStreetLight();
    const lightRight = createStreetLight();
    const zPos = roadLength / 2 - lightSpacing / 2 - i * lightSpacing;
    const xPos = roadWidth / 2 + kerbWidth + 0.8;
    lightLeft.position.set(-xPos, 0, zPos);
    lightLeft.rotation.y = Math.PI / 2;
    lightLeft.children[1].position.x = -lightLeft.userData.armLength / 2;
    lightLeft.children[2].position.x = -lightLeft.userData.armLength;
    lightRight.position.set(xPos, 0, zPos);
    lightRight.rotation.y = -Math.PI / 2;
    lightRight.children[1].position.x = -lightRight.userData.armLength / 2;
    lightRight.children[2].position.x = -lightRight.userData.armLength;
    streetLights.push(lightLeft, lightRight);
    scene.add(lightLeft);
    scene.add(lightRight);
  }
  function createTrafficLight() {
    const group = new THREE.Group();
    const poleHeight = 5;
    const poleRadius = 0.15;
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.7,
      roughness: 0.5,
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = poleHeight / 2;
    pole.castShadow = true;
    group.add(pole);
    const housingWidth = 0.5;
    const housingHeight = 1.2;
    const housingDepth = 0.3;
    const housingGeo = new THREE.BoxGeometry(
      housingWidth,
      housingHeight,
      housingDepth
    );
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.y = poleHeight - housingHeight / 2;
    housing.castShadow = true;
    group.add(housing);
    const lightRadius = housingWidth * 0.25;
    const lightGeo = new THREE.SphereGeometry(lightRadius, 16, 8);
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xaa0000,
      emissiveIntensity: 1,
    });
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xaaaa00,
      emissiveIntensity: 1,
    });
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00aa00,
      emissiveIntensity: 1,
    });
    const redLight = new THREE.Mesh(lightGeo, redMat);
    redLight.position.set(0, housingHeight * 0.3, housingDepth / 2 + 0.01);
    housing.add(redLight);
    const yellowLight = new THREE.Mesh(lightGeo, yellowMat);
    yellowLight.position.set(0, 0, housingDepth / 2 + 0.01);
    housing.add(yellowLight);
    const greenLight = new THREE.Mesh(lightGeo, greenMat);
    greenLight.position.set(0, -housingHeight * 0.3, housingDepth / 2 + 0.01);
    housing.add(greenLight);
    return group;
  }
  const trafficLightLeft = createTrafficLight();
  const trafficLightRight = createTrafficLight();
  const trafficLightZ = roadLength * 0.4;
  const trafficLightX = roadWidth / 2 + kerbWidth + 0.5;
  trafficLightLeft.position.set(-trafficLightX, 0, trafficLightZ);
  trafficLightLeft.rotation.y = Math.PI / 2;
  trafficLightRight.position.set(trafficLightX, 0, trafficLightZ);
  trafficLightRight.rotation.y = -Math.PI / 2;
  trafficLights.push(trafficLightLeft, trafficLightRight);
  scene.add(trafficLightLeft);
  scene.add(trafficLightRight);

  // --- Points Setup ---
  pointGeometry = new THREE.SphereGeometry(pointRadius, 8, 8);
  pointMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xaaaa00,
    emissiveIntensity: 0.8,
  });
  for (let i = 0; i < numPoints; i++) {
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    point.castShadow = true;
    resetPointPosition(point, true);
    points.push(point);
    scene.add(point);
  }

  // --- Car Model Loading ---
  const loader = new GLTFLoader(loadingManager);
  const dracoLoader = new DRACOLoader(loadingManager);
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );
  loader.setDRACOLoader(dracoLoader);
  const carUrl = "https://threejs.org/examples/models/gltf/ferrari.glb";

  loader.load(
    carUrl,
    (gltf) => {
      carModel = gltf.scene;
      carModel.scale.set(0.8, 0.8, 0.8);
      const box = new THREE.Box3().setFromObject(carModel);
      const carBottomOffset = box.min.y;
      carBaseY = -carBottomOffset + 0.01;
      carModel.position.set(0, carBaseY, 0);
      carModel.rotation.y = Math.PI;
      carModel.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      scene.add(carModel);

      // Enemy Car Setup
      enemyCar = carModel.clone();
      enemyCar.traverse((node) => {
        if (node.isMesh) {
          const blueMaterial = node.material.clone();
          blueMaterial.color.setHex(0x0000ff);
          node.material = blueMaterial;
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      resetEnemyCarPosition();
      scene.add(enemyCar);

      // Set initial Camera position
      camera.position.set(0, carBaseY + 3, -7);
      camera.lookAt(carModel.position.x, carBaseY + 1, carModel.position.z + 5);

      // Start engine sound
      if (engineSound) {
        engineSound.volume = 0.5;
        engineSound
          .play()
          .catch((e) => console.error("Error playing engine sound:", e));
      }
    },
    undefined,
    (error) => {
      console.error("An error happened loading the car model:", error);
      const fallbackGeo = new THREE.BoxGeometry(2, 1, 4);
      const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      carModel = new THREE.Mesh(fallbackGeo, fallbackMat);
      carBaseY = 0.5 + 0.01;
      carModel.position.set(0, carBaseY, 0);
      carModel.castShadow = true;
      carModel.receiveShadow = true;
      scene.add(carModel);
      camera.position.set(0, carBaseY + 3, -7);
      camera.lookAt(carModel.position.x, carBaseY + 1, carModel.position.z + 5);
      loadingScreen.textContent = "Error loading car model. Displaying fallback.";
      loadingScreen.classList.remove("hidden");
      loadingScreen.style.opacity = 1;
    }
  );

  // --- Resize Listener ---
  window.addEventListener("resize", onWindowResize, false);

  // --- Initial Score & Speed Display ---
  updateScoreDisplay();
  updateSpeedDisplay();
}

function setupControls() {
  window.addEventListener("keydown", (event) => {
    if (isGameOver) return;
    switch (event.key) {
      case "ArrowLeft":
      case "a":
        moveLeft = true;
        break;
      case "ArrowRight":
      case "d":
        moveRight = true;
        break;
      case "ArrowUp":
      case "w":
        accelerate = true;
        brake = false;
        break;
      case "ArrowDown":
      case "s":
        brake = true;
        accelerate = false;
        if (!wasBraking && brakeSound) {
          brakeSound.currentTime = 0;
          brakeSound.volume = 0.7;
          brakeSound
            .play()
            .catch((e) => console.error("Error playing brake sound:", e));
        }
        wasBraking = true;
        break;
    }
  });
  window.addEventListener("keyup", (event) => {
    switch (event.key) {
      case "ArrowLeft":
      case "a":
        moveLeft = false;
        break;
      case "ArrowRight":
      case "d":
        moveRight = false;
        break;
      case "ArrowUp":
      case "w":
        accelerate = false;
        break;
      case "ArrowDown":
      case "s":
        brake = false;
        wasBraking = false;
        break;
    }
  });

  window.addEventListener("click", () => {
    if (isGameOver) {
      resetGame();
    }
  });
}

function resetPointPosition(point, initial = false) {
  const laneWidth = roadWidth / 2 - kerbWidth - pointRadius * 2;
  point.position.x = (Math.random() * 2 - 1) * laneWidth;
  point.position.y = pointRadius + 0.01;
  if (initial) {
    point.position.z = Math.random() * roadLength - roadLength / 2;
  } else {
    point.position.z = roadLength / 2 + Math.random() * roadLength * 0.5;
  }
  point.visible = true;
}

function resetEnemyCarPosition() {
  if (!enemyCar) return;
  const initialEnemyX =
    (((Math.random() < 0.5 ? -1 : 1) * roadWidth) / 4) * (0.5 + Math.random());
  enemyCar.position.set(initialEnemyX, carBaseY, roadLength * 0.7 + Math.random() * 50);
  enemyCar.rotation.y = Math.PI;
}

function updateScoreDisplay() {
  scoreElement.textContent = `Score: ${score}`;
}

function updateSpeedDisplay() {
  const displaySpeed = Math.max(0, Math.round(currentDriveSpeed * 100));
  speedIndicatorElement.textContent = `Speed: ${displaySpeed}`;
  if (engineSound && !isGameOver) {
    engineSound.volume =
      0.3 + ((currentDriveSpeed - minSpeed) / (maxSpeed - minSpeed)) * 0.4;
    engineSound.playbackRate =
      0.8 + ((currentDriveSpeed - minSpeed) / (maxSpeed - minSpeed)) * 0.4;
  }
}

function resetGame() {
  console.log("Resetting game...");
  isGameOver = false;
  gameOverElement.style.display = "none";

  score = 0;
  updateScoreDisplay();

  currentDriveSpeed = baseDriveSpeed;
  updateSpeedDisplay();

  if (carModel) {
    carModel.position.set(0, carBaseY, 0);
  }
  resetEnemyCarPosition();

  points.forEach((point) => resetPointPosition(point, true));

  moveLeft = false;
  moveRight = false;
  accelerate = false;
  brake = false;
  wasBraking = false;

  if (engineSound) {
    engineSound.currentTime = 0;
    engineSound
      .play()
      .catch((e) => console.error("Error playing engine sound:", e));
  }
  if (brakeSound) brakeSound.pause();
  if (crashSound) crashSound.pause();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);

  if (isGameOver) return;

  if (accelerate) {
    currentDriveSpeed += accelerationRate;
  } else if (brake) {
    currentDriveSpeed -= brakingRate;
  } else {
    if (currentDriveSpeed > baseDriveSpeed + friction) {
      currentDriveSpeed -= friction;
    } else if (currentDriveSpeed < baseDriveSpeed - friction) {
      currentDriveSpeed += friction;
    } else {
      currentDriveSpeed = baseDriveSpeed;
    }
  }
  currentDriveSpeed = Math.max(minSpeed, Math.min(maxSpeed, currentDriveSpeed));
  updateSpeedDisplay();

  const deltaZ = currentDriveSpeed;

  roadLines.forEach((line) => {
    line.position.z -= deltaZ;
    if (line.position.z < -roadLength / 2) {
      line.position.z += roadLength;
    }
  });
  buildings.forEach((building) => {
    building.position.z -= deltaZ;
    if (
      building.position.z <
      -roadLength / 2 - building.geometry.parameters.depth / 2
    ) {
      building.position.z += roadLength + Math.random() * buildingSpacing * 2;
      const sideSign = Math.sign(building.position.x);
      const xOffset =
        roadWidth / 2 +
        kerbWidth +
        1 +
        Math.random() * 3 +
        building.geometry.parameters.width / 2;
      building.position.x = sideSign * xOffset;
    }
  });
  streetLights.forEach((light) => {
    light.position.z -= deltaZ;
    if (light.position.z < -roadLength / 2) {
      light.position.z += roadLength + Math.random() * lightSpacing * 2;
    }
  });
  trafficLights.forEach((light) => {
    light.position.z -= deltaZ;
    if (light.position.z < -roadLength / 2) {
      light.position.z += roadLength * 1.5 + Math.random() * roadLength;
    }
  });

  points.forEach((point) => {
    if (!point.visible) return;
    point.position.z -= deltaZ;
    if (point.position.z < -roadLength / 2) {
      resetPointPosition(point);
    }
  });

  if (enemyCar) {
    enemyCar.position.z -= deltaZ + enemyRelativeSpeed;
    if (enemyCar.position.z < -roadLength / 2 - 20) {
      resetEnemyCarPosition();
    }
  }

  if (carModel && carBaseY > 0) {
    const box = new THREE.Box3().setFromObject(carModel);
    const carHalfWidth = box.getSize(new THREE.Vector3()).x / 2;
    const maxBounds = roadWidth / 2 - kerbWidth - carHalfWidth - 0.1;

    if (moveLeft && carModel.position.x > -maxBounds) {
      carModel.position.x -= carMoveSpeed;
    }
    if (moveRight && carModel.position.x < maxBounds) {
      carModel.position.x += carMoveSpeed;
    }
    carModel.position.x = Math.max(-maxBounds, Math.min(maxBounds, carModel.position.x));

    playerBox.setFromObject(carModel);

    const targetCameraX = carModel.position.x * 0.5;
    camera.position.x += (targetCameraX - camera.position.x) * 0.1;
    const targetCameraZ = -7 - (currentDriveSpeed - baseDriveSpeed) * 2;
    camera.position.z += (targetCameraZ - camera.position.z) * 0.05;
    camera.lookAt(carModel.position.x, carBaseY + 1, carModel.position.z + 5);
  }

  if (carModel) {
    points.forEach((point) => {
      if (!point.visible) return;
      pointBox.setFromObject(point);
      if (playerBox.intersectsBox(pointBox)) {
        score += pointValue;
        updateScoreDisplay();
        point.visible = false;
      }
    });

    if (enemyCar) {
      enemyBox.setFromObject(enemyCar);
      if (playerBox.intersectsBox(enemyBox)) {
        console.log("Collision detected!");
        isGameOver = true;
        gameOverElement.style.display = "block";

        if (brakeSound) brakeSound.pause();

        if (crashSound) {
          crashSound.currentTime = 0;
          crashSound.volume = 0.8;
          crashSound
            .play()
            .catch((e) => console.error("Error playing crash sound:", e));

          crashSound.onended = () => {
            if (engineSound) engineSound.pause();
          };
        } else {
          if (engineSound) engineSound.pause();
        }
      }
    }
  }
}