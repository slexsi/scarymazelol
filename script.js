// =====================
// --- Setup Canvas ---
// =====================
const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");

// --- Player / Enemy setup ---
let player = {x:50, y:50, size:40}; // size adjusted for image
let enemy = {x:500, y:50, size:40, speed:1.5};

// Load images
const playerImg = new Image();
playerImg.src = "player.png";

const enemyImg = new Image();
enemyImg.src = "enemy.png";

// --- Keys ---
let keys = [
    {x:500, y:300, size:30, collected:false},
    {x:100, y:350, size:30, collected:false}
];
let collectedKeys = 0;

// --- Quiz Setup ---
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

// =====================
// --- DOM Elements ---
// =====================
const quizContainer = document.getElementById("quiz-container");
const questionEl = document.getElementById("quiz-question");
const answersEl = document.getElementById("quiz-answers");
const timerBar = document.getElementById("quiz-timer-bar");
const scoreEl = document.getElementById("quiz-score");
const keysCountEl = document.getElementById("keys-count");
const totalScoreEl = document.getElementById("total-score");

const bgSong = document.getElementById("bg-song");
const specialSFX = document.getElementById("special-sfx");

// =====================
// --- Start Game ---
// =====================
bgSong.play();
drawMaze();

// =====================
// --- Movement ---
// =====================
document.addEventListener('keydown', movePlayer);

function movePlayer(e){
    if(quizActive) return; // disable movement during quiz
    switch(e.key){
        case "ArrowUp": player.y -=5; break;
        case "ArrowDown": player.y +=5; break;
        case "ArrowLeft": player.x -=5; break;
        case "ArrowRight": player.x +=5; break;
    }
    checkCollision();
    moveEnemy();
    drawMaze();
}

// =====================
// --- Enemy AI ---
// =====================
function moveEnemy(){
    let dx = player.x - enemy.x;
    let dy = player.y - enemy.y;
    let dist = Math.hypot(dx,dy);
    if(dist>0){
        enemy.x += (dx/dist)*enemy.speed;
        enemy.y += (dy/dist)*enemy.speed;
    }
}

// =====================
// --- Collision Check ---
// =====================
function checkCollision(){
    keys.forEach((k,i)=>{
        if(!k.collected && Math.abs(player.x-k.x)<30 && Math.abs(player.y-k.y)<30){
            k.collected = true;
            collectedKeys++;
            keysCountEl.textContent = collectedKeys;
            startQuizForKey(i);
        }
    });
}

// =====================
// --- Draw Maze ---
// =====================
function drawMaze(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Draw keys
    keys.forEach(k=>{
        if(!k.collected){
            ctx.fillStyle = "gold";
            ctx.fillRect(k.x,k.y,k.size,k.size);
        }
    });

    // Draw player
    ctx.drawImage(playerImg, player.x, player.y, player.size, player.size);

    // Draw enemy
    ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.size, enemy.size);
}

// =====================
// --- Quiz Functions ---
// =====================
function startQuizForKey(keyIndex){
    quizActive = true;
    canvas.style.display = "none";
    quizContainer.style.display = "block";
    quizScore = 0;
    let start = keyIndex*3;
    currentQuizQuestions = quizQuestions.slice(start,start+3);
    currentQuestionIndex = 0;
    loadQuizQuestion();
}

function loadQuizQuestion(){
    if(currentQuestionIndex >= currentQuizQuestions.length){
        endQuiz();
        return;
    }
    let q = currentQuizQuestions[currentQuestionIndex];
    questionEl.textContent = q.question;
    answersEl.innerHTML = "";
    q.answers.forEach(ans=>{
        const btn = document.createElement("button");
        btn.textContent = ans;
        btn.onclick = ()=>answerQuestion(ans);
        answersEl.appendChild(btn);
    });
    startQuizTimer();
}

function startQuizTimer(){
    quizDuration = 8 + Math.random()*7; // 8-15 sec
    quizStartTime = Date.now();
    specialSFX.played = false;
    timerBar.style.width="100%";

    clearInterval(quizTimer);
    quizTimer = setInterval(()=>{
        let elapsed = (Date.now() - quizStartTime)/1000;
        timerBar.style.width = `${Math.max(0, 100 - (elapsed/quizDuration*100))}%`;

        if(elapsed>=5 && !specialSFX.played){
            specialSFX.played = true;
            specialSFX.play();
        }

        if(elapsed>=quizDuration){
            clearInterval(quizTimer);
            nextQuestion(false);
        }
    },50);
}

function answerQuestion(answer){
    clearInterval(quizTimer);
    let q = currentQuizQuestions[currentQuestionIndex];
    nextQuestion(answer===q.correct);
}

function nextQuestion(correct){
    const buttons = document.querySelectorAll("#quiz-answers button");
    buttons.forEach(btn=>{
        if(btn.textContent === currentQuizQuestions[currentQuestionIndex].correct) btn.classList.add("correct");
        else btn.classList.add("wrong");
    });

    if(correct){
        let elapsed = (Date.now() - quizStartTime)/1000;
        let points = Math.floor(100*(quizDuration/elapsed));
        quizScore += points;
    }

    currentQuestionIndex++;
    setTimeout(loadQuizQuestion,1000);
}

function endQuiz(){
    totalScore += quizScore;
    totalScoreEl.textContent = totalScore;
    quizContainer.style.display = "none";
    canvas.style.display = "block";
    quizActive = false;

    if(collectedKeys >= keys.length){
        alert("All keys collected! Total Score: "+totalScore);
    }
    drawMaze();
}
