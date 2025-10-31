// ======================
// --- Canvas & Setup ---
const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");

// Player / Jackenstein
let player = {x:50, y:50, size:40};
let enemy = {x:500, y:50, size:40, speed:1.2};

const playerImg = new Image();
playerImg.src = "player.png";
const enemyImg = new Image();
enemyImg.src = "enemy.png";

// Maze walls
const walls = [
    {x:0,y:0,w:600,h:10}, {x:0,y:0,w:10,h:400}, {x:0,y:390,w:600,h:10}, {x:590,y:0,w:10,h:400},
    {x:100,y:0,w:10,h:300}, {x:200,y:100,w:10,h:300}, {x:300,y:0,w:10,h:250}, {x:400,y:150,w:10,h:250},
    {x:500,y:0,w:10,h:300}
];

// Keys
let keys = [
    {x:50, y:350, size:30, collected:false},
    {x:550, y:50, size:30, collected:false}
];
let collectedKeys = 0;

// Quiz
const quizQuestions = [
    {question:"2 + 2 = ?", answers:["3","4","5","6"], correct:"4"},
    {question:"Sky color?", answers:["Red","Blue","Green","Yellow"], correct:"Blue"},
    {question:"Capital of France?", answers:["Paris","Berlin","Rome","Madrid"], correct:"Paris"},
    {question:"5 * 3 = ?", answers:["15","10","20","13"], correct:"15"},
    {question:"Water freezes at ?", answers:["0°C","100°C","50°C","-1°C"], correct:"0°C"},
    {question:"Sun rises from?", answers:["East","West","North","South"], correct:"East"}
];

let quizActive = false;
let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let quizScore = 0;
let quizTimer, quizDuration, quizStartTime;

// DOM
const quizContainer = document.getElementById("quiz-container");
const questionEl = document.getElementById("quiz-question");
const answersEl = document.getElementById("quiz-answers");
const timerBar = document.getElementById("quiz-timer-bar");
const scoreEl = document.getElementById("quiz-score");
const keysCountEl = document.getElementById("keys-count");
const totalScoreEl = document.getElementById("total-score");

const bgSong = document.getElementById("bg-song");
const specialSFX = document.getElementById("special-sfx");

// Start game
bgSong.play();
requestAnimationFrame(gameLoop);

// Movement
const keysDown = {};
document.addEventListener('keydown', e=>{keysDown[e.key]=true;});
document.addEventListener('keyup', e=>{keysDown[e.key]=false;});

// ======================
// --- Game Functions ---
function movePlayer(){
    if(quizActive) return;
    let speed=3;
    let newX=player.x;
    let newY=player.y;
    if(keysDown["ArrowUp"]) newY-=speed;
    if(keysDown["ArrowDown"]) newY+=speed;
    if(keysDown["ArrowLeft"]) newX-=speed;
    if(keysDown["ArrowRight"]) newX+=speed;

    if(!checkCollisionWall(newX, player.y)) player.x=newX;
    if(!checkCollisionWall(player.x, newY)) player.y=newY;

    checkCollisionKey();
}

function moveEnemy(){
    let dx=player.x-enemy.x;
    let dy=player.y-enemy.y;
    let dist=Math.hypot(dx,dy);
    if(dist>0){
        let moveX=(dx/dist)*enemy.speed;
        let moveY=(dy/dist)*enemy.speed;
        if(!checkCollisionWall(enemy.x+moveX, enemy.y)) enemy.x+=moveX;
        if(!checkCollisionWall(enemy.x, enemy.y+moveY)) enemy.y+=moveY;
    }
}

function checkCollisionWall(x,y){
    let rect={x:x,y:y,w:player.size,h:player.size};
    for(let w of walls){
        if(rectsOverlap(rect,w)) return true;
    }
    return false;
}

function rectsOverlap(r1,r2){
    return !(r1.x+r1.w<r2.x || r1.x>r2.x+r2.w || r1.y+r1.h<r2.y || r1.y>r2.y+r2.h);
}

function checkCollisionKey(){
    keys.forEach((k,i)=>{
        if(!k.collected && Math.abs(player.x-k.x)<30 && Math.abs(player.y-k.y)<30){
            k.collected=true;
            collectedKeys++;
            keysCountEl.textContent=collectedKeys;
            startQuizForKey(i);
        }
    });
}

// Draw
function drawMaze(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // walls
    ctx.fillStyle="gray";
    walls.forEach(w=>ctx.fillRect(w.x,w.y,w.w,w.h));
    // keys
    keys.forEach(k=>{if(!k.collected){ctx.fillStyle="gold"; ctx.fillRect(k.x,k.y,k.size,k.size);}});
    // player & enemy
    ctx.drawImage(playerImg, player.x, player.y, player.size, player.size);
    ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.size, enemy.size);
}

// Game Loop
function gameLoop(){
    movePlayer();
    moveEnemy();
    if(!quizActive) drawMaze();
    requestAnimationFrame(gameLoop);
}

// ======================
// --- Quiz Functions ---
function startQuizForKey(keyIndex){
    quizActive=true;
    canvas.style.display="none";
    quizContainer.style.display="block";
    quizScore=0;
    let start=keyIndex*3;
    currentQuizQuestions=quizQuestions.slice(start,start+3);
    currentQuestionIndex=0;
    loadQuizQuestion();
}

function loadQuizQuestion(){
    if(currentQuestionIndex>=currentQuizQuestions.length){
        endQuiz();
        return;
    }
    let q=currentQuizQuestions[currentQuestionIndex];
    questionEl.textContent=q.question;
    answersEl.innerHTML="";
    q.answers.forEach(ans=>{
        const btn=document.createElement("button");
        btn.textContent=ans;
        btn.onclick=()=>answerQuestion(ans);
        answersEl.appendChild(btn);
    });
    startQuizTimer();
}

function startQuizTimer(){
    quizDuration=8+Math.random()*7;
    quizStartTime=Date.now();
    specialSFX.played=false;
    timerBar.style.width="100%";
    clearInterval(quizTimer);
    quizTimer=setInterval(()=>{
        let elapsed=(Date.now()-quizStartTime)/1000;
        timerBar.style.width=`${Math.max(0,100-(elapsed/quizDuration*100))}%`;
        if(elapsed>=5 && !specialSFX.played){ specialSFX.played=true; specialSFX.play(); }
        if(elapsed>=quizDuration){ clearInterval(quizTimer); nextQuestion(false); }
    },50);
}

function answerQuestion(answer){
    clearInterval(quizTimer);
    let q=currentQuizQuestions[currentQuestionIndex];
    nextQuestion(answer===q.correct);
}

function nextQuestion(correct){
    const buttons=document.querySelectorAll("#quiz-answers button");
    buttons.forEach(btn=>{
        if(btn.textContent===currentQuizQuestions[currentQuestionIndex].correct) btn.classList.add("correct");
        else btn.classList.add("wrong");
    });
    if(correct){
        let elapsed=(Date.now()-quizStartTime)/1000;
        let points=Math.floor(100*(quizDuration/elapsed));
        quizScore+=points;
    }
    currentQuestionIndex++;
    setTimeout(loadQuizQuestion,1000);
}

function endQuiz(){
    totalScoreEl.textContent = (parseInt(totalScoreEl.textContent) + quizScore);
    quizContainer.style.display="none";
    canvas.style.display="block";
    quizActive=false;
    if(collectedKeys >= keys.length){
        alert("All keys collected! Total Score: "+totalScoreEl.textContent);
    }
}
