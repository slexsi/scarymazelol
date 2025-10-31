const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

const bgSong = document.getElementById('bg-song');
const specialSFX = document.getElementById('special-sfx');

const quizContainer = document.getElementById('quiz-container');
const quizTab = document.getElementById('quiz-tab');
const timerBar = document.getElementById('quiz-timer-bar');
const totalScoreEl = document.getElementById('total-score');

const gameOverContainer = document.getElementById('game-over-container');
const restartBtn = document.getElementById('restart-btn');

// ====== IMAGES ======
let playerImg = new Image(); playerImg.src = 'player.png';
let enemyImg  = new Image(); enemyImg.src  = 'enemy.png';
let keyImg    = new Image(); keyImg.src    = 'key.png';
let wallImg   = new Image(); wallImg.src   = 'wall.png';

// ====== GAME OBJECTS ======
let player = { x:50, y:50, size:40, speed:3 };
let enemy = { x:500, y:50, size:40, speed:1.5 };
let key = { x:300, y:200, size:30, collected:false };
let score = 0;

let keysDown = {};
document.addEventListener('keydown', e => keysDown[e.key] = true);
document.addEventListener('keyup', e => keysDown[e.key] = false);

let quizActive = false;
let quizTimer = null;
let quizDuration = 0;
let quizStartTime = 0;
let currentQuizSet = [];
let currentQuestionIndex = 0;

const quizQuestions = [
  { question:"1 + 1 = ?", answers:["1","2","3"], correct:"2" },
  { question:"Color of sky?", answers:["Red","Green","Blue"], correct:"Blue" },
  { question:"Capital of France?", answers:["Paris","London","Rome"], correct:"Paris" }
];

let running = true;

// ====== MAZE WALLS ======
const walls = [
  {x:0,y:0,w:600,h:20},    // top
  {x:0,y:0,w:20,h:400},    // left
  {x:0,y:380,w:600,h:20},  // bottom
  {x:580,y:0,w:20,h:400},  // right
  {x:100,y:100,w:20,h:200},// vertical inside
  {x:250,y:50,w:20,h:150}, // vertical inside
  {x:400,y:200,w:20,h:150} // vertical inside
];

// ====== CANVAS RESIZE ======
canvas.width = 600;
canvas.height = 400;

function resizeCanvas(){
  const aspect = canvas.width / canvas.height;
  let width = window.innerWidth - 40;
  let height = window.innerHeight - 100;
  if(width/height > aspect) width = height * aspect;
  else height = width / aspect;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
  resizeCanvas();
  bgSong.volume = 0.5;
  bgSong.play().catch(()=>{});
});
document.addEventListener('click', ()=>{bgSong.play().catch(()=>{});},{once:true});

// ====== MOVEMENT ======
function movePlayer(){
  if(quizActive) return;
  let nx = player.x, ny = player.y;
  if(keysDown['ArrowUp'] || keysDown['w']) ny -= player.speed;
  if(keysDown['ArrowDown'] || keysDown['s']) ny += player.speed;
  if(keysDown['ArrowLeft'] || keysDown['a']) nx -= player.speed;
  if(keysDown['ArrowRight'] || keysDown['d']) nx += player.speed;

  if(!checkCollisionWall(nx, player.y)) player.x = nx;
  if(!checkCollisionWall(player.x, ny)) player.y = ny;
}

function moveEnemy(){
  if(quizActive) return;
  let dx = player.x - enemy.x, dy = player.y - enemy.y;
  let dist = Math.hypot(dx, dy);
  if(dist>0){
    enemy.x += (dx/dist)*enemy.speed;
    enemy.y += (dy/dist)*enemy.speed;
  }
}

// ====== COLLISIONS ======
function rectsOverlap(r1,r2){
  return !(r1.x+r1.w<r2.x || r1.x>r2.x+r2.w || r1.y+r1.h<r2.y || r1.y>r2.y+r2.h);
}

function checkCollisionWall(x,y){
  const rect = {x:x,y:y,w:player.size,h:player.size};
  return walls.some(w => rectsOverlap(rect, w));
}

function checkKey(){
  if(!key.collected && Math.abs(player.x - key.x) < 30 && Math.abs(player.y - key.y) < 30){
    key.collected = true;
    startQuiz();
  }
}

// ====== DRAW ======
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // walls
  walls.forEach(w=>{
    if(wallImg.complete) ctx.drawImage(wallImg, w.x, w.y, w.w, w.h);
    else ctx.fillStyle='gray', ctx.fillRect(w.x,w.y,w.w,w.h);
  });

  // key
  if(!key.collected){
    if(keyImg.complete) ctx.drawImage(keyImg,key.x,key.y,key.size,key.size);
    else ctx.fillStyle='gold', ctx.fillRect(key.x,key.y,key.size,key.size);
  }

  // player
  if(playerImg.complete) ctx.drawImage(playerImg,player.x,player.y,player.size,player.size);
  else ctx.fillStyle='cyan', ctx.fillRect(player.x,player.y,player.size,player.size);

  // enemy
  if(enemyImg.complete) ctx.drawImage(enemyImg,enemy.x,enemy.y,enemy.size,enemy.size);
  else ctx.fillStyle='red', ctx.fillRect(enemy.x,enemy.y,enemy.size,enemy.size);
}

// ====== GAME LOOP ======
function loop(){
  if(!running) return;
  movePlayer();
  moveEnemy();
  checkKey();
  if(Math.hypot(player.x - enemy.x, player.y - enemy.y) < 28){ gameOver(); return; }
  draw();
  requestAnimationFrame(loop);
}

// ====== QUIZ FUNCTIONS ======
function startQuiz(){
  quizActive = true;
  currentQuizSet = quizQuestions.slice();
  currentQuestionIndex = 0;
  quizContainer.style.display = 'flex';
  canvas.style.display = 'none';
  startQuizTimer();
  showQuestion(0);
}

function showQuestion(index){
  currentQuestionIndex = index;
  quizTab.innerHTML = '';
  const q = currentQuizSet[index];
  const p = document.createElement('p'); p.textContent = q.question;
  quizTab.appendChild(p);
  q.answers.forEach(a=>{
    const btn = document.createElement('button');
    btn.textContent = a;
    btn.onclick = ()=>answerQuestion(a);
    quizTab.appendChild(btn);
  });
}

function answerQuestion(ans){
  const q = currentQuizSet[currentQuestionIndex];
  if(ans === q.correct){ score += 100; totalScoreEl.textContent = score; }
  currentQuestionIndex++;
  if(currentQuestionIndex >= currentQuizSet.length){ endQuiz(); }
  else showQuestion(currentQuestionIndex);
}

function startQuizTimer(){
  if(quizTimer) clearInterval(quizTimer);
  quizDuration = 8 + Math.random()*7;
  quizStartTime = Date.now();
  specialSFX.played = false;
  timerBar.style.width = '100%';
  quizTimer = setInterval(()=>{
    let elapsed = (Date.now() - quizStartTime)/1000;
    timerBar.style.width = Math.max(0, 100-(elapsed/quizDuration*100)) + '%';
    if(elapsed >= 5 && !specialSFX.played){ specialSFX.played = true; specialSFX.play(); }
    if(elapsed>=quizDuration){ clearInterval(quizTimer); endQuiz(); }
  },50);
}

function endQuiz(){
  quizActive=false;
  quizContainer.style.display='none';
  canvas.style.display='block';
  resizeCanvas();
}

// ====== GAME OVER ======
function gameOver(){
  running=false;
  canvas.style.display='none';
  gameOverContainer.style.display='flex';
  bgSong.pause();
}

// ====== RESTART ======
restartBtn.addEventListener('click', ()=>{
  player = { x:50, y:50, size:40, speed:3 };
  enemy = { x:500, y:50, size:40, speed:1.5 };
  key = { x:300, y:200, size:30, collected:false };
  score = 0; totalScoreEl.textContent = 0;
  running=true; gameOverContainer.style.display='none';
  canvas.style.display='block';
  resizeCanvas();
  bgSong.currentTime=0; bgSong.play().catch(()=>{});
  requestAnimationFrame(loop);
});

// ====== START GAME AFTER IMAGES LOAD ======
let imagesLoaded = 0;
[playerImg, enemyImg, keyImg, wallImg].forEach(img=>{
  img.onload = ()=>{
    imagesLoaded++;
    if(imagesLoaded === 4) requestAnimationFrame(loop);
  };
});
