/* game main */
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

const bgSong = document.getElementById('bg-song');
const specialSFX = document.getElementById('special-sfx');

const quizContainer = document.getElementById('quiz-container');
const questionEl = document.getElementById('quiz-question');
const answersEl = document.getElementById('quiz-answers');
const timerBar = document.getElementById('quiz-timer-bar');
const scoreEl = document.getElementById('quiz-score');

const keysCountEl = document.getElementById('keys-count');
const keysTotalEl = document.getElementById('keys-total');
const totalScoreEl = document.getElementById('total-score');
const levelNumberEl = document.getElementById('level-number');
const gameOverContainer = document.getElementById('game-over-container');
const restartBtn = document.getElementById('restart-btn');

let quizQuestions = [];          // loaded from quiz.json
let totalScore = 0;

// player & enemy sprites
let playerImg = new Image(); playerImg.src = 'player.png';
let enemyImg  = new Image(); enemyImg.src  = 'enemy.png';

let player = { x:50, y:50, size:40 };
let enemy  = { x:500, y:50, size:40, speed:1.5 }; // jackenstein speed (ignores walls)

// levels: walls + keys
const levels = [
  { // level 1
    walls:[
      {x:0,y:0,w:600,h:10},{x:0,y:0,w:10,h:400},{x:0,y:390,w:600,h:10},{x:590,y:0,w:10,h:400},
      {x:100,y:0,w:10,h:300},{x:200,y:100,w:10,h:300},{x:300,y:0,w:10,h:250},{x:400,y:150,w:10,h:250},{x:500,y:0,w:10,h:300}
    ],
    keys:[
      {x:50,y:350,size:30,collected:false},
      {x:550,y:50,size:30,collected:false}
    ]
  },
  { // level 2
    walls:[
      {x:0,y:0,w:600,h:10},{x:0,y:0,w:10,h:400},{x:0,y:390,w:600,h:10},{x:590,y:0,w:10,h:400},
      {x:50,y:50,w:10,h:300},{x:150,y:100,w:10,h:300},{x:250,y:0,w:10,h:250},{x:350,y:150,w:10,h:250},{x:450,y:0,w:10,h:300}
    ],
    keys:[
      {x:60,y:360,size:30,collected:false},
      {x:540,y:60,size:30,collected:false},
      {x:300,y:350,size:30,collected:false}
    ]
  }
];

let currentLevel = 0;
let walls = levels[currentLevel].walls;
let keys = levels[currentLevel].keys;
let collectedKeys = 0;

// movement
const keysDown = {};
document.addEventListener('keydown', (e)=>{ keysDown[e.key] = true; });
document.addEventListener('keyup', (e)=>{ keysDown[e.key] = false; });

// quiz state
let quizActive = false;
let currentQuizSet = [];   // 3 questions for this key
let currentQuestionIndex = 0;
let quizScore = 0;
let quizTimer = null;
let quizStartTime = 0;
let quizDuration = 0;

// time / speed increase
let lastSpeedIncreaseTimestamp = performance.now();
const speedIncreaseIntervalMs = 5000; // every 5s
const speedIncreaseAmount = 0.12;     // add to enemy.speed

// game control
let running = true; // game loop flag

// HUD init
keysTotalEl.textContent = keys.length;
levelNumberEl.textContent = currentLevel + 1;
keysCountEl.textContent = collectedKeys;
totalScoreEl.textContent = totalScore;

// load quiz questions externally
fetch('quiz.json')
  .then(r => r.json())
  .then(data => {
    quizQuestions = Array.isArray(data) ? data.slice() : [];
  })
  .catch(err=>{
    console.warn('Failed to load quiz.json — using empty questions.', err);
  });

// helper: pick N random unique questions
function pickRandomQuestions(n){
  if(quizQuestions.length === 0) return [];
  // shallow copy and shuffle
  let pool = quizQuestions.slice();
  for(let i=pool.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

// collision helpers
function rectsOverlap(r1, r2){
  return !(r1.x + r1.w < r2.x || r1.x > r2.x + r2.w || r1.y + r1.h < r2.y || r1.y > r2.y + r2.h);
}
function checkCollisionWall(x, y){
  const rect = { x:x, y:y, w:player.size, h:player.size };
  for(const w of walls) if(rectsOverlap(rect, w)) return true;
  return false;
}

// player movement (blocked by walls)
function movePlayer(){
  if(quizActive) return;
  let speed = 3;
  let newX = player.x;
  let newY = player.y;
  if(keysDown['ArrowUp'] || keysDown['w']) newY -= speed;
  if(keysDown['ArrowDown'] || keysDown['s']) newY += speed;
  if(keysDown['ArrowLeft'] || keysDown['a']) newX -= speed;
  if(keysDown['ArrowRight'] || keysDown['d']) newX += speed;
  if(!checkCollisionWall(newX, player.y)) player.x = newX;
  if(!checkCollisionWall(player.x, newY)) player.y = newY;
  checkCollisionKey();
}

// enemy movement (ignores walls entirely)
function moveEnemy(){
  // if quizActive we pause enemy too (per your request)
  if(quizActive) return;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  if(dist <= 0.1) return;
  enemy.x += (dx / dist) * enemy.speed;
  enemy.y += (dy / dist) * enemy.speed;
}

// pick up keys and start quiz
function checkCollisionKey(){
  for(let i=0;i<keys.length;i++){
    const k = keys[i];
    if(!k.collected && Math.abs(player.x - k.x) < 30 && Math.abs(player.y - k.y) < 30){
      k.collected = true;
      collectedKeys++;
      keysCountEl.textContent = collectedKeys;
      startQuizForKey(i);
      break;
    }
  }
}

// draw everything
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // draw walls
  ctx.fillStyle = '#444';
  for(const w of walls) ctx.fillRect(w.x, w.y, w.w, w.h);
  // draw keys
  for(const k of keys){
    if(!k.collected){
      ctx.fillStyle = '#f0c000';
      ctx.fillRect(k.x, k.y, k.size, k.size);
    }
  }
  // draw player & enemy images (if not loaded yet, fallback to rectangles)
  if(playerImg.complete) ctx.drawImage(playerImg, player.x, player.y, player.size, player.size);
  else { ctx.fillStyle='cyan'; ctx.fillRect(player.x, player.y, player.size, player.size); }
  if(enemyImg.complete) ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.size, enemy.size);
  else { ctx.fillStyle='crimson'; ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size); }
}

// game over
function triggerGameOver(){
  running = false;
  bgSong.pause();
  quizContainer.style.display = 'none';
  canvas.style.display = 'none';
  gameOverContainer.style.display = 'flex';
}

// restart (reload state)
function restartGame(){
  // reset level 0
  currentLevel = 0;
  walls = levels[currentLevel].walls;
  keys = JSON.parse(JSON.stringify(levels[currentLevel].keys)); // deep copy so collected flags reset
  collectedKeys = 0;
  keysCountEl.textContent = collectedKeys;
  keysTotalEl.textContent = keys.length;
  levelNumberEl.textContent = currentLevel + 1;
  totalScore = 0;
  totalScoreEl.textContent = totalScore;
  player = { x:50, y:50, size:40 };
  enemy = { x:500, y:50, size:40, speed:1.5 };
  canvas.style.display = 'block';
  gameOverContainer.style.display = 'none';
  running = true;
  lastSpeedIncreaseTimestamp = performance.now();
  requestAnimationFrame(loop);
  bgSong.currentTime = 0;
  bgSong.play().catch(()=>{});
}
restartBtn.addEventListener('click', restartGame);

// quiz flow
function startQuizForKey(keyIndex){
  // pause game loop effects
  quizActive = true;
  // pick 3 random questions from quiz.json
  currentQuizSet = pickRandomQuestions(3);
  currentQuestionIndex = 0;
  quizScore = 0;
  // show UI
  quizContainer.style.display = 'flex';
  canvas.style.display = 'none';
  renderQuizQuestion();
}

function renderQuizQuestion(){
  if(!currentQuizSet || currentQuestionIndex >= currentQuizSet.length){
    endQuiz();
    return;
  }
  const q = currentQuizSet[currentQuestionIndex];
  questionEl.textContent = q.question;
  answersEl.innerHTML = '';
  for(const a of q.answers){
    const btn = document.createElement('button');
    btn.textContent = a;
    btn.onclick = ()=> handleAnswer(a);
    answersEl.appendChild(btn);
  }
  // reset and start timer
  startQuizTimer();
  scoreEl.textContent = `Score: ${quizScore}`;
}

function startQuizTimer(){
  if(quizTimer) clearInterval(quizTimer);
  quizDuration = 8 + Math.random()*7; // 8-15 sec
  quizStartTime = Date.now();
  specialSFX.played = false;
  timerBar.style.width = '100%';
  quizTimer = setInterval(()=>{
    const elapsed = (Date.now() - quizStartTime)/1000;
    const fraction = Math.max(0, 100 - (elapsed / quizDuration * 100));
    timerBar.style.width = fraction + '%';
    if(elapsed >= 5 && !specialSFX.played){
      specialSFX.played = true;
      specialSFX.play();
    }
    if(elapsed >= quizDuration){
      clearInterval(quizTimer);
      handleAnswer(null); // timeout => wrong
    }
  }, 50);
}

function handleAnswer(answer){
  if(quizTimer) clearInterval(quizTimer);
  const q = currentQuizSet[currentQuestionIndex];
  // mark buttons
  const buttons = answersEl.querySelectorAll('button');
  buttons.forEach(b=>{
    if(b.textContent === q.correct) b.classList.add('correct');
    else b.classList.add('wrong');
  });
  if(answer === q.correct){
    // speed-based points
    const elapsed = (Date.now() - quizStartTime)/1000;
    const points = Math.floor(100 * (quizDuration / Math.max(0.001, elapsed)));
    quizScore += points;
  }
  currentQuestionIndex++;
  setTimeout(renderQuizQuestion, 900);
}

function endQuiz(){
  // add quizScore to total
  totalScore += quizScore;
  totalScoreEl.textContent = totalScore;
  // hide quiz and resume
  quizContainer.style.display = 'none';
  canvas.style.display = 'block';
  quizActive = false;
  // level progression: if all keys collected, load next level
  if(collectedKeys >= keys.length){
    currentLevel++;
    if(currentLevel < levels.length){
      walls = levels[currentLevel].walls;
      // deep clone keys so we can toggle collected flags
      keys = JSON.parse(JSON.stringify(levels[currentLevel].keys));
      collectedKeys = 0;
      keysCountEl.textContent = collectedKeys;
      keysTotalEl.textContent = keys.length;
      levelNumberEl.textContent = currentLevel + 1;
      // reset positions
      player.x = 50; player.y = 50;
      enemy.x = 500; enemy.y = 50;
    } else {
      alert('All levels cleared! Final score: ' + totalScore);
    }
  }
}

/* game loop */
function loop(now){
  if(!running) return;
  // handle player & enemy movement (enemy is paused when quizActive)
  movePlayer();
  moveEnemy();
  // check catch: if enemy close enough to player -> game over
  if(Math.hypot(player.x - enemy.x, player.y - enemy.y) < 28){
    triggerGameOver();
    return;
  }
  // manage speed increase over time (only when not paused)
  if(!quizActive){
    if(now - lastSpeedIncreaseTimestamp >= speedIncreaseIntervalMs){
      enemy.speed += speedIncreaseAmount;
      lastSpeedIncreaseTimestamp = now;
    }
  } else {
    // when quizActive, don't advance lastSpeedIncreaseTimestamp, so the timer pauses
    lastSpeedIncreaseTimestamp = now - (speedIncreaseIntervalMs - (now - lastSpeedIncreaseTimestamp));
  }
  draw();
  requestAnimationFrame(loop);
}

// start
bgSong.play().catch(()=>{});
lastSpeedIncreaseTimestamp = performance.now();
requestAnimationFrame(loop);
