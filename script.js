const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

const bgSong = document.getElementById('bg-song');
const specialSFX = document.getElementById('special-sfx');

const quizContainer = document.getElementById('quiz-container');
const quizTab = document.getElementById('quiz-tab');
const quizTabsButtons = document.getElementById('quiz-tabs-buttons');
const timerBar = document.getElementById('quiz-timer-bar');
const scoreEl = document.getElementById('quiz-score');

const keysCountEl = document.getElementById('keys-count');
const keysTotalEl = document.getElementById('keys-total');
const totalScoreEl = document.getElementById('total-score');
const levelNumberEl = document.getElementById('level-number');
const gameOverContainer = document.getElementById('game-over-container');
const restartBtn = document.getElementById('restart-btn');

let quizQuestions = [];
let totalScore = 0;

let playerImg = new Image(); playerImg.src = 'player.png';
let enemyImg  = new Image(); enemyImg.src  = 'enemy.png';

let player = { x:50, y:50, size:40 };
let enemy  = { x:500, y:50, size:40, speed:1.5 };

const levels = [
  { walls:[{x:0,y:0,w:600,h:10},{x:0,y:0,w:10,h:400},{x:0,y:390,w:600,h:10},{x:590,y:0,w:10,h:400},{x:100,y:0,w:10,h:300},{x:200,y:100,w:10,h:300},{x:300,y:0,w:10,h:250},{x:400,y:150,w:10,h:250},{x:500,y:0,w:10,h:300}], keys:[{x:50,y:350,size:30,collected:false},{x:550,y:50,size:30,collected:false}]},
  { walls:[{x:0,y:0,w:600,h:10},{x:0,y:0,w:10,h:400},{x:0,y:390,w:600,h:10},{x:590,y:0,w:10,h:400},{x:50,y:50,w:10,h:300},{x:150,y:100,w:10,h:300},{x:250,y:0,w:10,h:250},{x:350,y:150,w:10,h:250},{x:450,y:0,w:10,h:300}], keys:[{x:60,y:360,size:30,collected:false},{x:540,y:60,size:30,collected:false},{x:300,y:350,size:30,collected:false}]}
];

let currentLevel = 0;
let walls = levels[currentLevel].walls;
let keys = JSON.parse(JSON.stringify(levels[currentLevel].keys));
let collectedKeys = 0;

const keysDown = {};
document.addEventListener('keydown', e=>keysDown[e.key]=true);
document.addEventListener('keyup', e=>keysDown[e.key]=false);

let quizActive=false;
let currentQuizSet=[],quizScore=0,quizTimer=null,quizStartTime=0,quizDuration=0;
let lastSpeedIncreaseTimestamp=performance.now();
const speedIncreaseIntervalMs=5000,speedIncreaseAmount=0.12;
let running=true;

keysTotalEl.textContent=keys.length;
levelNumberEl.textContent=currentLevel+1;
keysCountEl.textContent=collectedKeys;
totalScoreEl.textContent=totalScore;

fetch('quiz.json').then(r=>r.json()).then(data=>quizQuestions=data).catch(err=>console.warn(err));

function pickRandomQuestions(n){
  if(quizQuestions.length===0) return [];
  let pool=quizQuestions.slice();
  for(let i=pool.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,Math.min(n,pool.length));
}

function rectsOverlap(r1,r2){return !(r1.x+r1.w<r2.x||r1.x>r2.x+r2.w||r1.y+r1.h<r2.y||r1.y>r2.y+r2.h);}
function checkCollisionWall(x,y){const rect={x:x,y:y,w:player.size,h:player.size};return walls.some(w=>rectsOverlap(rect,w));}

function movePlayer(){if(quizActive) return;let speed=3;let nx=player.x,ny=player.y;if(keysDown['ArrowUp']||keysDown['w']) ny-=speed;if(keysDown['ArrowDown']||keysDown['s']) ny+=speed;if(keysDown['ArrowLeft']||keysDown['a']) nx-=speed;if(keysDown['ArrowRight']||keysDown['d']) nx+=speed;if(!checkCollisionWall(nx,player.y)) player.x=nx;if(!checkCollisionWall(player.x,ny)) player.y=ny;checkCollisionKey();}
function moveEnemy(){if(quizActive) return;let dx=player.x-enemy.x,dy=player.y-enemy.y,dist=Math.hypot(dx,dy);if(dist>0){enemy.x+=(dx/dist)*enemy.speed;enemy.y+=(dy/dist)*enemy.speed;}}

function checkCollisionKey(){
  for(let i=0;i<keys.length;i++){
    const k=keys[i];
    if(!k.collected && Math.abs(player.x-k.x)<30 && Math.abs(player.y-k.y)<30){
      k.collected=true;
      collectedKeys++;
      keysCountEl.textContent=collectedKeys;
      startQuizForKey(i);
      break;
    }
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#444'; for(const w of walls) ctx.fillRect(w.x,w.y,w.w,w.h);
  for(const k of keys){if(!k.collected){ctx.fillStyle='#f0c000'; ctx.fillRect(k.x,k.y,k.size,k.size);}}
  if(playerImg.complete) ctx.drawImage(playerImg,player.x,player.y,player.size,player.size);else{ctx.fillStyle='cyan'; ctx.fillRect(player.x,player.y,player.size,player.size);}
  if(enemyImg.complete) ctx.drawImage(enemyImg,enemy.x,enemy.y,enemy.size,enemy.size);else{ctx.fillStyle='crimson'; ctx.fillRect(enemy.x,enemy.y,enemy.size,enemy.size);}
}

// ======== GAME OVER & RESTART ========
function triggerGameOver(){
  running=false;
  bgSong.pause();
  canvas.style.display='none';
  quizContainer.style.display='none';
  gameOverContainer.style.display='flex';
  gameOverContainer.style.zIndex = 1000;
}
function restartGame(){
  currentLevel=0; walls=levels[currentLevel].walls; keys=JSON.parse(JSON.stringify(levels[currentLevel].keys));
  collectedKeys=0; keysCountEl.textContent=collectedKeys; keysTotalEl.textContent=keys.length; levelNumberEl.textContent=currentLevel+1;
  totalScore=0; totalScoreEl.textContent=totalScore; player=findSafeStart(walls); enemy={x:500,y:50,size:40,speed:1.5};
  canvas.style.display='block'; gameOverContainer.style.display='none'; running=true; lastSpeedIncreaseTimestamp=performance.now(); requestAnimationFrame(loop);
  bgSong.currentTime=0; bgSong.play().catch(()=>{});
}
restartBtn.addEventListener('click',restartGame);

function findSafeStart(levelWalls){
  let start={x:50,y:50,size:40},tries=0;
  while(levelWalls.some(w=>rectsOverlap({x:start.x,y:start.y,w:start.size,h:start.size},w))&&tries<100){start.x+=10;start.y+=10;tries++;}
  return start;
}

// ======== QUIZ FUNCTIONS ========
let currentQuestionIndex=0;

function startQuizForKey(kIndex){
  quizActive=true;
  currentQuizSet=pickRandomQuestions(3);
  quizScore=0;
  quizContainer.style.display='flex';
  canvas.style.display='none';
  setupQuizTabs();
  startQuizTimer();
}

function setupQuizTabs(){
  quizTabsButtons.innerHTML='';
  currentQuizSet.forEach((q,i)=>{
    const btn=document.createElement('button');
    btn.textContent='Q'+(i+1);
    btn.onclick=()=>showQuizQuestion(i);
    if(i===0) btn.classList.add('active');
    quizTabsButtons.appendChild(btn);
  });
  showQuizQuestion(0);
}

function showQuizQuestion(index){
  currentQuestionIndex=index;
  [...quizTabsButtons.children].forEach((b,i)=>b.classList.toggle('active',i===index));
  const q=currentQuizSet[index];
  quizTab.innerHTML='';
  const qEl=document.createElement('p'); qEl.textContent=q.question; quizTab.appendChild(qEl);
  q.answers.forEach(a=>{
    const btn=document.createElement('button');
    btn.textContent=a;
    if(quizActive) btn.onclick=()=>answerQuestion(index,a);
    if(q.userAnswer){
      btn.disabled=true;
      if(a===q.correct) btn.classList.add('correct');
      else if(a===q.userAnswer) btn.classList.add('wrong');
    }
    quizTab.appendChild(btn);
  });
}

function answerQuestion(qIndex,answer){
  const q=currentQuizSet[qIndex];
  if(q.userAnswer) return;
  q.userAnswer=answer;
  if(answer===q.correct){
    const elapsed=(Date.now()-quizStartTime)/1000;
    quizScore+=Math.floor(100*(quizDuration/Math.max(0.001,elapsed)));
  }
  showQuizQuestion(qIndex);
}

function startQuizTimer(){
  if(quizTimer) clearInterval(quizTimer);
  quizDuration=8+Math.random()*7;
  quizStartTime=Date.now();
  specialSFX.played=false;
  timerBar.style.width='100%';
  quizTimer=setInterval(()=>{
    const elapsed=(Date.now()-quizStartTime)/1000;
    timerBar.style.width=Math.max(0,100-(elapsed/quizDuration*100))+'%';
    if(elapsed>=5&&!specialSFX.played){specialSFX.played=true;specialSFX.play();}
    if(elapsed>=quizDuration){clearInterval(quizTimer); endQuiz(); }
  },50);
}

function endQuiz(){
  quizActive=false;
  if(quizTimer) clearInterval(quizTimer);

  currentQuizSet.forEach((q,i)=>{
    if(!q.userAnswer) q.userAnswer=''; 
  });

  [...quizTabsButtons.children].forEach((btn,i)=>{
    const q=currentQuizSet[i];
    btn.textContent='Q'+(i+1);
    if(q.userAnswer){
      if(q.userAnswer===q.correct) btn.textContent+=' ✔';
      else btn.textContent+=' ✖';
    }
  });

  currentQuestionIndex=0;
  showQuizQuestion(0);

  quizScore=0;
  currentQuizSet.forEach(q=>{
    if(q.userAnswer===q.correct){
      const elapsed=(Date.now()-quizStartTime)/1000;
      quizScore+=Math.floor(100*(quizDuration/Math.max(0.001,elapsed)));
    }
  });
  totalScore+=quizScore;
  totalScoreEl.textContent=totalScore;

  setTimeout(()=>{
    quizContainer.style.display='none';
    canvas.style.display='block';
  },1200);

  if(collectedKeys>=keys.length){
    currentLevel++;
    if(currentLevel<levels.length){
      walls=levels[currentLevel].walls; 
      keys=JSON.parse(JSON.stringify(levels[currentLevel].keys)); 
      collectedKeys=0; keysCountEl.textContent=collectedKeys; keysTotalEl.textContent=keys.length; 
      levelNumberEl.textContent=currentLevel+1; 
      player=findSafeStart(walls); 
      enemy={x:500,y:50,size:40,speed:1.5};
    } else{
      alert('All levels cleared! Final score: '+totalScore);
    }
  }
}

// ======== GAME LOOP ========
function loop(now){
  if(!running) return;
  movePlayer();
  moveEnemy();
  if(Math.hypot(player.x-enemy.x,player.y-enemy.y)<28){triggerGameOver();return;}
  if(!quizActive){if(now-lastSpeedIncreaseTimestamp>=speedIncreaseIntervalMs){enemy.speed+=speedIncreaseAmount;lastSpeedIncreaseTimestamp=now;}} 
  draw();requestAnimationFrame(loop);
}

// ======== RESPONSIVE CANVAS ========
function resizeCanvas(){
  const aspect = 600/400;
  let width = window.innerWidth - 40;
  let height = window.innerHeight - 100;
  if(width/height > aspect) width = height*aspect;
  else height = width/aspect;
  canvas.width = 600;
  canvas.height = 400;
  canvas.style.width = width+'px';
  canvas.style.height = height+'px';
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', ()=>{resizeCanvas(); bgSong.volume=0.5; bgSong.play().catch(()=>{});});
requestAnimationFrame(loop);
