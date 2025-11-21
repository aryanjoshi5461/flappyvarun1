// --- Canvas & Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const overlay = document.getElementById('overlay');
const countdownEl = document.getElementById('countdown');
const gameOverWrapper = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');
const loseVideo = document.getElementById('loseVideo');

const scoreList = document.getElementById('scoreList');

// --- Assets
const birdImg = new Image();
birdImg.src = "assets/bird.png";

const pipeTopImg = new Image();
pipeTopImg.src = "assets/pipe-top.png";

const pipeBottomImg = new Image();
pipeBottomImg.src = "assets/pipe-bottom.png";

const flapSound = new Audio("assets/flap.wav");
const hitSound = new Audio("assets/hit.wav");

// --- Game Settings
let W = window.innerWidth * 0.9;
let H = window.innerHeight * 0.6;
canvas.width = W;
canvas.height = H;

let PIPE_WIDTH = 60;
let PIPE_GAP = 140;
let PIPE_INTERVAL_FRAMES = 165;   // horizontal gap
let PIPE_SPEED = 1.2;

let state = "countdown";
let countdown = 3;

// Bird physics
let bird = {
    x: 80,
    y: H / 2 - 20,
    w: 36,
    h: 28,
    vel: 0,
    gravity: 0.10,
    flapPower: -3.8
};

let pipes = [];
let frame = 0;
let score = 0;

const DEATH_SLOW_GRAVITY = 0.005;
const SHOW_RESTART_DELAY_MS = 4000;

// Hide overlay initially
overlay.classList.add("hidden");
overlay.style.display = "none";

// --- Helpers
function drawBackground() {
    ctx.fillStyle = "#70c5ce";
    ctx.fillRect(0, 0, W, H);
}

function makePipe(x) {
    const topH = Math.floor(Math.random() * 200) + 50;
    return {
        x: x,
        top: topH,
        bottom: topH + PIPE_GAP,
        width: PIPE_WIDTH,
        passed: false
    };
}

// --- Scoreboard helpers
function updateScoreboard(score) {
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

    let highScores = JSON.parse(localStorage.getItem("highScores") || "[]");

    highScores.push({score:score, time:timeStr});
    highScores.sort((a,b)=>b.score-a.score);
    highScores = highScores.slice(0,5);

    localStorage.setItem("highScores", JSON.stringify(highScores));

    scoreList.innerHTML = "";
    highScores.forEach(h=>{
        const li = document.createElement('li');
        li.textContent = `${h.score} - ${h.time}`;
        scoreList.appendChild(li);
    });
}

// --- Countdown
function startCountdownAuto() {
    state = "countdown";
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
    countdownEl.classList.remove("hidden");
    gameOverWrapper.classList.add("hidden");
    loseVideo.classList.add("hidden");

    countdownEl.textContent = countdown;

    const cd = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownEl.textContent = countdown;
        } else {
            clearInterval(cd);
            countdownEl.classList.add("hidden");
            overlay.classList.add("hidden");
            overlay.style.display = "none";
            beginPlay();
        }
    }, 1000);
}

// --- Begin Play
function beginPlay() {
    state = "playing";
    frame = 1;
    pipes = [];
    score = 0;

    bird.y = H / 2 - 20;
    bird.vel = 0;

    requestAnimationFrame(loop);
}

// --- Input
function flap() {
    if (state === "playing") {
        bird.vel = bird.flapPower;
        flapSound.currentTime = 0;
        flapSound.play().catch(() => {});
    }
}

// Desktop keyboard
window.addEventListener("keydown", (e) => {
    if(e.code === "Space") flap();
});

// Mobile touch
window.addEventListener("touchstart", (e) => {
    flap();
});

// --- Restart
restartBtn.addEventListener("click", () => {
    if (state === "gameover" && !restartBtn.disabled) {
        location.reload(true); // CTRL+F5 effect: full reload
    }
});

// --- Game Over
function triggerGameOver() {
    if (state === "gameover") return;

    state = "gameover";

    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
    gameOverWrapper.classList.remove("hidden");
    countdownEl.classList.add("hidden");

    loseVideo.classList.remove("hidden");
    loseVideo.currentTime = 0;
    loseVideo.play().catch(() => {});

    hitSound.currentTime = 0;
    hitSound.play().catch(() => {});

    restartBtn.disabled = true;
    restartBtn.style.opacity = "0.4";

    // Save & update scoreboard
    updateScoreboard(score);

    setTimeout(() => {
        restartBtn.disabled = false;
        restartBtn.style.opacity = "1";
    }, SHOW_RESTART_DELAY_MS);
}

// --- Update
function update() {
    if (state === "playing") {
        bird.vel += bird.gravity;
        bird.y += bird.vel;

        if (frame % PIPE_INTERVAL_FRAMES === 0) {
            pipes.push(makePipe(W + 10));
        }

        pipes.forEach((p) => {
            p.x -= PIPE_SPEED;

            if (!p.passed && p.x + p.width < bird.x) {
                p.passed = true;
                score++;
            }
        });

        pipes = pipes.filter((p) => p.x + p.width > -50);

        // Collision
        for (let p of pipes) {
            if (
                bird.x < p.x + p.width &&
                bird.x + bird.w > p.x &&
                (bird.y < p.top || bird.y + bird.h > p.bottom)
            ) {
                triggerGameOver();
            }
        }

        if (bird.y + bird.h >= H) {
            bird.y = H - bird.h;
            triggerGameOver();
        }
        if (bird.y < 0) {
            bird.y = 0;
            bird.vel = 0;
        }

        frame++;
    } else if (state === "gameover") {
        bird.vel += DEATH_SLOW_GRAVITY;
        bird.y += bird.vel;
        if (bird.y + bird.h > H) bird.y = H - bird.h;
    }
}

// --- Draw
function draw() {
    drawBackground();

    pipes.forEach((p) => {
        ctx.drawImage(pipeTopImg, p.x, p.top - 400, p.width, 400);
        ctx.drawImage(pipeBottomImg, p.x, p.bottom, p.width, 400);
    });

    ctx.drawImage(birdImg, bird.x, bird.y, bird.w, bird.h);

    ctx.fillStyle = "#fff";
    ctx.font = "36px Arial";
    ctx.fillText(score, 18, 48);
}

// --- Loop
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// --- Init
window.addEventListener("load", () => {
    setTimeout(() => startCountdownAuto(), 200);
    // Load initial scoreboard
    let stored = JSON.parse(localStorage.getItem("highScores") || "[]");
    if(stored.length>0){
        scoreList.innerHTML="";
        stored.forEach(h=>{
            const li=document.createElement('li');
            li.textContent = `${h.score} - ${h.time}`;
            scoreList.appendChild(li);
        });
    }
});
