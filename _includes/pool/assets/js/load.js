// Load Game

function loadGame() {
    const saved = readStoredJson('pool_score_data', null, {
        removeInvalid: true,
        onError: () => alert('The saved active match was corrupted and could not be restored. Match history was not affected.')
    });
    if (!saved) return;

    try {
        validateActiveMatch(saved);
        gameState = saved;
        if (!gameState.table) gameState.table = Array.from({ length: 15 }, (_, i) => ({
            id: i + 1, state: 'active'
        }));
        showGameUI();
    } catch (error) {
        console.error('Invalid active match:', error);
        localStorage.removeItem('pool_score_data');
        alert('The saved active match was invalid and could not be restored. Match history was not affected.');
    }
}

// Render Game UI

function render() {

    const container = document.getElementById('player-container');
    if (!gameState || !container) return;

    const p1 = gameState.players[0];
    const p2 = gameState.players[1];
    const active = gameState.players[gameState.currentTurn];
    const rules = GAME_RULES[gameState.mode];

const ballGrid = `
<div class="row row-cols-5 g-1"> 
    ${gameState.table.slice(0, rules.maxBalls).map(b => {
        // Define what icon to show based on the state
        const statusIcon = (b.state === 'selected' || b.state === 'pocketed') ? '✓' : 
                           (b.state === 'killed' || b.state === 'dead') ? '✕' : 
                           b.id;

        const ballStatus = b.state === 'dead' || b.state === 'pocketed' ? 'disabled': '';

        return `
            <div class="col">
                <button class="ball ${b.state}" onclick="toggleBall(${b.id})" data-id="${b.id}" ${ballStatus}>
                    ${statusIcon}
                </button>
            </div>
        `;
    }).join('')}
</div>`;

    container.innerHTML = `
    <div class="container m--0 p-1">
        <!-- Scoreboard Header -->
        <div class="body m-0 p-0" style="display:flex; justify-content:space-between;">
            <div style="flex:1; ${gameState.currentTurn === 0 ? 'color:var(--bs-success); font-weight:bold' : ''}">
                <div style="font-size:1.2em;">${p1.name}</div>
                <div>${p1.score}/${p1.target} pts</div>
                <div><small>${p1.group ? `${p1.group}` : ''}</small></div>
            </div>
            <div style="flex:1.0; align-self:center; text-align: center; font-weight:bold;">
                <h3 style="margin:0;"><small>Shooting:</small><br/>
                <strong><span style="color:var(--bs-success)">${active.name}</span></strong></h3>
                <p class="m-0 p-0">Inning: ${gameState.currentInningIndex}</p>
            </div>
            <div style="text-align:right; flex:1; ${gameState.currentTurn === 1 ? 'color:var(--bs-success); font-weight:bold' : ''}">
                <div style="font-size:1.2em;">${p2.name}</div>
                <div>${p2.score}/${p2.target} pts</div>
                <div><small>${p2.group ? `${p2.group}` : ''}</small></div>
            </div>
        </div>
        <div class="row mt-0 pt-1 pb-1" style="border-bottom:1px solid #ddd; min-height:34px;">
            <div id="p0Balls" class="col"></div>
            <div id="p1Balls" class="col" style="text-align:right;"></div>
        </div>

        <!-- Table Controls -->
        <div style="padding:4px; text-align:center; max-width:390px; margin-left:auto; margin-right:auto;">
            ${ballGrid}
            <div class="row mt-1 g-1">
                <div class="col w-100"><button class="btn btn-outline-secondary w-100 p-3 m-0" data-bs-toggle="offcanvas" data-bs-target="#timeout-modal" onclick="useTimeout(${gameState.currentTurn})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stopwatch" viewBox="0 0 16 16">
                    <path d="M8.5 5.6a.5.5 0 1 0-1 0v2.9h-3a.5.5 0 0 0 0 1H8a.5.5 0 0 0 .5-.5z"/>
                    <path d="M6.5 1A.5.5 0 0 1 7 .5h2a.5.5 0 0 1 0 1v.57c1.36.196 2.594.78 3.584 1.64l.012-.013.354-.354-.354-.353a.5.5 0 0 1 .707-.708l1.414 1.415a.5.5 0 1 1-.707.707l-.353-.354-.354.354-.013.012A7 7 0 1 1 7 2.071V1.5a.5.5 0 0 1-.5-.5M8 3a6 6 0 1 0 .001 12A6 6 0 0 0 8 3"/>
                    </svg> Timeouts: ${active.timeouts}</button>
                </div>
            </div>
            <div class="row mt-1 g-1 mb-1">
                <div class="col-sm-4 w-50"><button class="btn btn-dark w-100 p-3 m-0" data-bs-toggle="offcanvas" data-bs-target="#ingameMenu">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-gear" viewBox="0 0 16 16">
                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
                    </svg>  Settings</button>
                </div>
                <div class="col-sm-2 w-50"><button class="btn btn-outline-primary w-100 p-3 m-0" onclick="undoInning()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/>
                    </svg> Undo</button>
                </div>
            </div>

            <div class="row mt-2 g-1">
                <div class="btn-group mt-0" role="group" aria-label="Error Action Type">
                    <input type="checkbox" class="btn-check" id="miscuebtn" autocomplete="off">
                    <label class="btn btn-outline-danger mt-0 p-3" for="miscuebtn">Miscue</label>
                    <input type="checkbox" class="btn-check" id="foulbtn" autocomplete="off">
                    <label class="btn btn-outline-danger mt-0 p-3" for="foulbtn">Foul</label>
                    <input type="checkbox" class="btn-check" id="scratchbtn" autocomplete="off">
                    <label class="btn btn-outline-danger mt-0 p-3" for="scratchbtn">Scratch</label>
                </div>
            </div>

            <div class="row mt-2 g-1">
                <div class="btn-group mt-0" role="group" aria-label="Safety Action Type">
                    <input type="checkbox" class="btn-check" id="escapebtn" autocomplete="off">
                    <label class="btn btn-outline-warning mt-0 p-3" for="escapebtn">Escape</label>
                    <input type="checkbox" class="btn-check" id="kickbtn" autocomplete="off">
                    <label class="btn btn-outline-warning mt-0 p-3" for="kickbtn">Kick</label>
                    <input type="checkbox" class="btn-check" id="safetybtn" autocomplete="off">
                    <label class="btn btn-outline-warning mt-0 p-3" for="safetybtn">Safety</label>
                </div>
            </div>
            <div class="row mt-1 g-1">
                <div class="col w-100"><button class="btn btn-success w-100 p-3 m-0" onclick="handleTurn('score')">End ${active.name}'s Turn</button></div>
            </div>
        </div>
    </div>`;


// console.log(gameState.innings);

// console.log("Current Rack we are looking for:", gameState.currentRack);

const rackBalls = gameState.innings.filter(i => {
    // We check both players just in case player 0 is 'waiting'
    const rackValue = i["0"].rack; 
    const isMatch = Number(rackValue) === Number(gameState.currentRack);
    
    // console.log(`Checking Inning ${i.inning}: Data says Rack ${rackValue}. Match? ${isMatch}`);
    return isMatch;
});

const allBallsPlayer0 = rackBalls.flatMap(i => i["0"].balls);
const allBallsPlayer1 = rackBalls.flatMap(i => i["1"].balls);


// Get the SVG strings for each ball
const p0BallSvgs = allBallsPlayer0.map(ball => getBallSvg(ball)).join('');
const p1BallSvgs = allBallsPlayer1.map(ball => getBallSvg(ball)).join('');

// Put them into the divs
const p0Div = document.getElementById('p0Balls');
const p1Div = document.getElementById('p1Balls');

if (p0Div) {
    p0Div.innerHTML = allBallsPlayer0.length > 0 ? p0BallSvgs : " ";
}

if (p1Div) {
    p1Div.innerHTML = allBallsPlayer1.length > 0 ? p1BallSvgs : '<span style="display:none; min-height:16px;">No balls yet</span>';
}



// console.log("Final Balls Array:", allBallsPlayer0);
// console.log("Final Balls Array:", allBallsPlayer1);
// console.log(gameState);

}


// Load Game UI

function showGameUI() {
    document.getElementById('setup-form').style.display = 'none'; document.getElementById('game-ui').style.display = 'block'; render();
}

// Reset Table

function resetTable() {
    // Reset balls and rack-specific counters only
    gameState.table.forEach(b => b.state = 'active');
    gameState.rackShotCount = 0;

    gameState.players.forEach(p => {
        p.group = null; // Clear 8-ball groups for new rack
        p.timeouts = (p.skill <= 3 ? 2 : 1);
    });

    saveGame();
    render();
}

// SVG Ball Helper

const getBallSvg = (ball) => {
    const num = parseInt(ball);
    const isStriped = num >= 9 && num <= 15;
    const colors = ['#FFD700', '#0000FF', '#FF0000', '#800080', '#FFA500', '#008000', '#800000', '#000000'];
    const color = colors[(num - 1) % 8] || 'none';

    if (isStriped) {
        return `
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
            <defs>
                <clipPath id="clip">
                <circle cx="100" cy="100" r="94"/>
                </clipPath>
            </defs>
            <circle cx="100" cy="100" r="94" fill="white" stroke="#999" stroke-width="2"/>
            <rect x="0" y="45" width="200" height="110" fill="${color}" clip-path="url(#clip)"/>
            <circle cx="100" cy="100" r="45" fill="white"/>
            <text x="100" y="115" font-size="50" text-anchor="middle" fill="black" font-family="Arial" font-weight="bold">${ball}</text>
            </svg>
        `;
    } else {
        return `
            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="94" fill="${color}" stroke="#999" stroke-width="2"/>
            <circle cx="100" cy="100" r="45" fill="white"/>
            <text x="100" y="115" font-size="50" text-anchor="middle" fill="black" font-family="Arial" font-weight="bold">${ball}</text>
            </svg>
        `;
    }

};

// Celebrate!

    function launchConfetti() {
        // Set pieces
        const count = 500; 
        const colors = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#ced6e0', '#e84393', '#74b9ff'];
        
        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            // Randomize shapes (rectangles vs squares)
            confetti.style.width = Math.random() * 8 + 5 + 'px';
            confetti.style.height = Math.random() * 8 + 5 + 'px';

            const startX = window.innerWidth / 2;
            const startY = 0;
            
            // Wider spread and a downward "gravity" trajectory
            const destX = (Math.random() - 0.5) * 1500;
            const destY = (Math.random() * 900); // Drifts mostly downward
            const rotation = Math.random() * 1000; // More spins

            confetti.style.left = startX + 'px';
            confetti.style.top = startY + 'px';

            document.body.appendChild(confetti);

            // Set duration
            const duration = 3000 + Math.random() * 2000;

            const animation = confetti.animate([
                { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
                { transform: `translate(${destX}px, ${destY}px) rotate(${rotation}deg)`, opacity: 0 }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.1, 1, 0.3, 1)', // Snappy start, very slow finish
                fill: 'forwards'
            });

            animation.onfinish = () => confetti.remove();
        }
    }


    // Rainbows

    // function launchRainbows() {
    // const count = 400; // Slightly fewer pieces since they are much larger now

    // for (let i = 0; i < count; i++) {
    //     const piece = document.createElement('div');
    //     piece.classList.add('confetti');
        
    //     // Vivid Rainbow Gradient
    //     piece.style.background = 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b008b)';
        
    //     // SIGNIFICANTLY LARGER SIZE
    //     // Width between 30px and 60px, Height between 15px and 25px
    //     piece.style.width = Math.random() * 20 + 30 + 'px';
    //     piece.style.height = Math.random() * 5 + 10 + 'px';
    //     piece.style.borderRadius = '4px'; // Rounded edges for a "ribbon" look

    //     const startX = window.innerWidth / 2;
    //     const startY = 0;
        
    //     // Adjust physics for larger pieces (slower, drifting)
    //     const destX = (Math.random() - 0.5) * 1200;
    //     const destY = (Math.random() * 900); 
    //     const rotation = (Math.random() - 0.5) * 1000;

    //     piece.style.left = startX + 'px';
    //     piece.style.top = startY + 'px';

    //     document.body.appendChild(piece);

    //     const duration = 4000 + Math.random() * 2000; // Lasts 4-6 seconds

    //     const animation = piece.animate([
    //         { transform: 'translate(-50%, -50%) rotate(0deg) scale(0)', opacity: 0 },
    //         { transform: 'translate(-50%, -50%) rotate(20deg) scale(1.2)', opacity: 1, offset: 0.1 }, // Pop out
    //         { transform: `translate(${destX}px, ${destY}px) rotate(${rotation}deg) scale(0.8)`, opacity: 0 }
    //     ], {
    //         duration: duration,
    //         easing: 'cubic-bezier(0.1, 1, 0.3, 1)',
    //         fill: 'forwards'
    //     });

    //     animation.onfinish = () => piece.remove();
    // }
    // }
