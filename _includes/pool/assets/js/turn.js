// Player Turn Control

function handleTurn(action) {
    const mode = gameState.mode;
    
    saveHistory();

    // Game Mode Switch

    switch (mode) {
        case '8-ball':
            handle8Ball(action);
            break;
        case '9-ball':
            handle9Ball(action);
            break;
        case '10-ball':
            handle10Ball(action);
            break;
        default:
            // Handle unexpected modes
            console.warn(`Unknown mode: ${mode}`);
            break;
    }

    saveGame();
}

function getActiveBallCount() {
    const activeCount = gameState.table.filter(b => b.state === 'pocketed').length;
    console.log("Active Ball Count:", activeCount);
    return activeCount;
}

function getPocketedBallCount() {
    const pocketedCount = gameState.table.filter(b => b.state === 'selected').length;
    console.log("Pocketed Ball Count:", pocketedCount);
    return pocketedCount;
}

// 8-Ball Logic

function handle8Ball(action) {
    const { p, opponent, pocketed, madeMoneyBall } = getTurnContext();
    
    const currentShot = gameState.rackShotCount || 0;
    const isBreakShot = (currentShot === 0);

    // Check for fouls or scratches
    const scratchChecked = document.getElementById('scratchbtn').checked;
    const foulChecked = document.getElementById('foulbtn').checked;

    const containsEight = pocketed.includes(8);

    // Define the ball groups
    const solids = [1, 2, 3, 4, 5, 6, 7];
    const stripes = [9, 10, 11, 12, 13, 14, 15];

    // Check if the pocketed list contains every ball from either group + the 8 ball
    const clearedSolids = solids.every(b => pocketed.includes(b)) && containsEight;
    const clearedStripes = stripes.every(b => pocketed.includes(b)) && containsEight;
    
    // Replacement condition for Break and Run
    const isBnR = (clearedSolids || clearedStripes) && isBreakShot;

    const is8Break = (containsEight && scratchChecked === false && foulChecked === false && isBreakShot && !isBnR);
    
    let resetRack = false;
    let earlyLoss = false;
    let pts = 0;

    if (is8Break && scratchChecked === false && foulChecked === false || isBnR  && scratchChecked === false && foulChecked === false) {
        p.racksWon++;
        pts = 1; 
        p.count8onbreak += is8Break ? 1 : 0;
        p.breakandruns += isBnR ? 1 : 0;
        resetRack = true;

        const awardCanvasElement = document.getElementById('awardOffcanvas');
        const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(awardCanvasElement);
        bsOffcanvas.show();
        
        if(is8Break) {
            award(0, '8 on the Break!');
        } else {
            award(0, 'Break and Run!'); // Updated text     
        }
    } else {
    // Group Assignment Logic
    if (pocketed.length > 0 && !p.group && scratchChecked === false && foulChecked === false) {
        assign8BallGroups(pocketed, p, opponent);
    }

    // Check win/loss conditions if the 8-ball was involved
    const ballsRemaining = getRemainingGroupBalls(p);
    const isOn8Ball = (p.group && ballsRemaining === 0);

    if (madeMoneyBall) {
        if (isOn8Ball && scratchChecked === false && foulChecked === false) {
            // Legal Win: Pocketed the 8 as the last ball
            p.racksWon++;
            pts = 1;
            resetRack = true;
        } else {
            // Illegal 8: Either early pocket or scratched on the 8
            earlyLoss = true;
        }
    } else if (scratchChecked === true && isOn8Ball || foulChecked === true && isOn8Ball) {
        // Foul while shooting at the 8-ball is a Loss of Game
        earlyLoss = true;
    }
}

    // Increment the counter so subsequent shots in this rack aren't "Snaps"
    gameState.rackShotCount++;

    // Finalize stats and move to the next turn
    finalizeTurn(action, pts, resetRack, earlyLoss, isBnR, is8Break);

}

// 8-Ball Helpers

function assign8BallGroups(selected, p, opponent) {
    let solidsCount = 0;
    let stripesCount = 0;

    for (let id of selected) {
        if (id >= 1 && id <= 7) solidsCount++;
        if (id >= 9 && id <= 15) stripesCount++;
    }

    // Only assign if one count is strictly higher than the other
    if (solidsCount > stripesCount) {
        p.group = 'Solids';
        opponent.group = 'Stripes';
        alert(`${p.name} pocketed more solids and is now Solids!`);
    } else if (stripesCount > solidsCount) {
        p.group = 'Stripes';
        opponent.group = 'Solids';
        alert(`${p.name} pocketed more stripes and is now Stripes!`);
    } else {
        // It's a tie (e.g., 1 solid and 1 stripe) or nothing was pocketed
        // Groups remain undefined/open
    }
}

function getRemainingGroupBalls(player) {
    if (!player.group) return -1; // Group not yet assigned

    return gameState.table.filter(b => {
        if (player.group === 'Solids') return b.id >= 1 && b.id <= 7 && b.state === 'active';
        if (player.group === 'Stripes') return b.id >= 9 && b.id <= 15 && b.state === 'active';
        return false;
    }).length;
}


// 9-Ball Logic

function handle9Ball(action) {
    const { p, rules, pocketed, madeMoneyBall } = getTurnContext();
    const isSingleGame = document.getElementById('gameStyleSingle').checked;
    const isSuddenDeath = document.getElementById('gameStyleSuddenDeath').checked;
    
    const currentShot = gameState.rackShotCount || 0;
    const isBreakShot = (currentShot === 0);

    // Check for fouls or scratches
    const scratchChecked = document.getElementById('scratchbtn').checked;
    const foulChecked = document.getElementById('foulbtn').checked;
    
    const containsNine = pocketed.includes(9);
    
    // A table clear is only a Break and Run when the same player also broke.
    const isBnR = is9BallBreakAndRun(pocketed, isBreakShot);

    const isSnap = (containsNine && scratchChecked === false && foulChecked === false && !isBnR && isBreakShot);

    let resetRack = false;
    let pts = 0;

    if (isSnap && scratchChecked === false && foulChecked === false || isBnR && scratchChecked === false && foulChecked === false) {
        p.racksWon++;
        p.count9onsnap += isSnap ? 1 : 0;
        p.breakandruns += isBnR ? 1 : 0;
        
        if (isSnap) {
            // Include value of all pocketed balls + 2 bonus points
            // pts = calculatePoints(pocketed, rules);
            
            if (isSingleGame) {
                respotBall(9);
                alert("9-ball spotted. Continue Shooting.");
            } else if (isSuddenDeath) {
                pts = (calculatePoints(pocketed, rules)) * 2;
            } else {
                pts = calculatePoints(pocketed, rules);
            }

            // alert("🚀 9-on-the-Snap!");
            const awardCanvasElement = document.getElementById('awardOffcanvas');
            const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(awardCanvasElement);
            bsOffcanvas.show();
            award(0,'9 on the Snap!');
        } else if (isSuddenDeath) {
            pts = 20;
            // alert("💥 Break and Run!");
            const awardCanvasElement = document.getElementById('awardOffcanvas');
            const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(awardCanvasElement);
            bsOffcanvas.show();
            award(0,'Break and Run!');            
        } else {
            pts = 10; // APA Break & Run
            // alert("💥 Break and Run!");
            const awardCanvasElement = document.getElementById('awardOffcanvas');
            const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(awardCanvasElement);
            bsOffcanvas.show();
            award(0,'Break and Run!');
        }
        resetRack = true;
    } 
    else if (madeMoneyBall && (scratchChecked === true || madeMoneyBall && foulChecked === true)) {
        respotBall(9);
        alert("9-ball spotted. Turnover.");
        pts = calculatePoints(pocketed.filter(id => id !== 9), rules);
    } 
    else if (madeMoneyBall && scratchChecked === false && foulChecked === false) {
        p.racksWon++;
        
        if (isSingleGame) {
            pts = p.target; 
        } else if (isSuddenDeath) {
            pts = (calculatePoints(pocketed, rules)) * 2;
        } else {
            pts = calculatePoints(pocketed, rules);
        }
        resetRack = true;
    }
    else {
        
        if (isSingleGame) {
            pts = 0; 
        } else if (isSuddenDeath) {
            pts = (calculatePoints(pocketed, rules)) * 2;
        } else {
            pts = calculatePoints(pocketed, rules);
        }
    }

    // Increment the counter so subsequent shots in this rack aren't "Snaps"
    gameState.rackShotCount++;

    finalizeTurn(action, pts, resetRack, false, isBnR, isSnap);
}


// Calculate 9-ball Points

function calculatePoints(pocketed, rules) {
    // If rules.ballValue is a function, use it; 
    // otherwise, default to 1 point per ball (common in some 9-ball formats)
    return pocketed.reduce((total, ballId) => {
        const val = (typeof rules.ballValue === 'function') 
            ? rules.ballValue(ballId) 
            : 1;
        return total + val;
    }, 0);
}


// 10-Ball Logic

function handle10Ball(action) {
    const { p, madeMoneyBall } = getTurnContext();
    const isBreakShot = (gameState.rackShotCount === 0);

    // Check for fouls or scratches
    const scratchChecked = document.getElementById('scratchbtn').checked;
    const foulChecked = document.getElementById('foulbtn').checked;
    
    let resetRack = false;
    let pts = 0;

    // Break and Run: If all 10 balls are pocketed on the break
    if (getPocketedBallCount() === 10 && isBreakShot && scratchChecked === false && foulChecked === false) {
        p.racksWon++;
        // pts = 1; // 1 point for Break and Run
        const awardCanvasElement = document.getElementById('awardOffcanvas');
        const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(awardCanvasElement);
        bsOffcanvas.show();
        award(0, 'Break and Run!');
        resetRack = true; // This triggers the rack reset in finalizeTurn
    }

    // If the 10-ball is made, ensure it's done legally
    if (madeMoneyBall) {
        // const remainingBalls = gameState.table.filter(ball => ball.state === 'selected' && ball.id !== 10); // Get active balls, excluding 10-ball
        const isLegalWin = (scratchChecked === false && foulChecked === false && getActiveBallCount() === 9 || getPocketedBallCount() + getActiveBallCount() === 10 );

        if (isLegalWin) {
            // Legal win: 10-ball made after all other balls are cleared
            p.racksWon++;
            pts += 1;
            resetRack = true;
        } else {
            // If the 10-ball was made early or scratched, it gets respotted
            respotBall(10); // Respot the 10-ball
            alert("10-ball spotted (Early or Scratch).");
        }
    }

    // Increment the rack shot count
    gameState.rackShotCount++;

    // Finalize the turn with points and reset status
    finalizeTurn(action, pts, resetRack);
}

// Shared Helpers

function getTurnContext() {
    const rules = GAME_RULES[gameState.mode];
    const p = gameState.currentTurn;
    const opponent = (gameState.currentTurn === 0) ? 1 : 0;

    return {
        p: gameState.players[p],
        opponent: gameState.players[opponent],
        rules: rules,
        pocketed: gameState.table.filter(b => b.state === 'selected').map(b => b.id),
        madeMoneyBall: gameState.table.some(b => b.id === rules.moneyBall && b.state === 'selected')
    };
}

// Finalize Turn Data

function finalizeTurn(action, pts, resetRack, earlyLoss = false, isBR = false, isSnap = false) {

const { p, opponent, pocketed } = getTurnContext();
    const pId = gameState.currentTurn;
    const oppId = (gameState.currentTurn === 0) ? 1 : 0;

// Ensure global array and index exist
if (!gameState.innings) gameState.innings = [];
if (gameState.currentInningIndex === undefined) gameState.currentInningIndex = 0;

const currentIdx = gameState.currentInningIndex;
const currentRack = gameState.currentRack;

// Initialize the inning entry for BOTH players at once
if (!gameState.innings[currentIdx]) {
    gameState.innings[currentIdx] = {
        inning: currentIdx,
        // We use the unique IDs as keys so the table knows exactly who is who
        [pId]: { 
            rack: currentRack,
            balls: [], 
            points: 0, 
            action: null,
            isBR: false // Useful for 'Break and Run' tracking
        },
        [oppId]: { 
            rack: currentRack,
            balls: [], 
            points: 0, 
            action: 'waiting', 
            isBR: false 
        }
    };
}

// Now you can safely update the current shooter's data
const currentPlayerInning = gameState.innings[currentIdx][pId];

// Record the results of this turn
if (pocketed && pocketed.length > 0) {
    // currentPlayerInning.balls.push(...pocketed.map(b => b.id));
    currentPlayerInning.balls.push(...pocketed);
    if (gameState.mode === '9-ball') {
    currentPlayerInning.points += pocketed.length;
        if (pocketed.includes(9)) {
            currentPlayerInning.points += 1; // Bonus for 9-ball
        }
    } else if (gameState.mode === '10-ball') {
        if (pocketed.includes(10)) {
            currentPlayerInning.points += 1; // Bonus for 10-ball
        }
    } else if (gameState.mode === '8-ball') {
        if (pocketed.includes(8)) {
            currentPlayerInning.points += 1; // Bonus for 8-ball
        }
    }
}

    // Save Persistent Badges/Flags for this Inning
    // This allows the render function to show 'BR' or 'SNAP'
    currentPlayerInning.isBR = isBR;
    currentPlayerInning.isSnap = isSnap;

    // Handle Early Loss for 8-ball
    if (earlyLoss) {
        opponent.racksWon++;
        opponent.score += 1;
        resetRack = true;
        alert(`Loss of Game! Rack awarded to ${opponent.name}.`);
        currentPlayerInning.action = 'loss';
    }

    // Update stats and Inning Data for the active player
    p.score += pts;

    if (document.getElementById('scratchbtn').checked) { 
        p.scratches++; 
        currentPlayerInning.action = 'scratch'; 
    }

    if (document.getElementById('foulbtn').checked) {
        p.fouls++; 
        currentPlayerInning.action = 'scratch'; 
    }

    if (document.getElementById('miscuebtn').checked) {
        p.miscues++; 
        currentPlayerInning.action = 'scratch'; 
    }

    if (document.getElementById('escapebtn').checked) { 
        p.escapes++; 
        currentPlayerInning.action = 'escape'; 
    }

    if (document.getElementById('kickbtn').checked) { 
        p.kickshots++; 
        currentPlayerInning.action = 'kickshot'; 
    }

    if (document.getElementById('safetybtn').checked) { 
        p.defensiveShots++; 
        currentPlayerInning.action = 'safety'; 
    }


    // Manage Table State and Inning Transitions
    if (resetRack) {
        // Mark all pocketed balls as 'dead' before resetting the table for the next rack
        gameState.table.forEach(b => { if(b.state === 'pocketed') b.state = 'dead'; });
        gameState.currentRack += 1;
        resetTable(); // Resets balls/rackShotCount but KEEPS match innings
        
        // Advance the inning row immediately when a rack ends to keep logic clean
        gameState.currentInningIndex++;
        
        // If someone lost early, the opponent starts the next rack
        if (earlyLoss) switchTurn();
    } else {
        markBallsDead();
        markBallsPocketed();
        
        // Standard Inning logic: Inning row increments after the second player finishes
        if (gameState.currentTurn === 1) {
            gameState.currentInningIndex++;
        }
        switchTurn();
    }

    // Increment rack-specific shot count
        gameState.rackShotCount + 1;
    


    const winner = gameState.players.find(player => player.score >= player.target);

    if (winner) {
            const offcanvasElement = document.getElementById('winnerOffcanvas');
            const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasElement);
            document.getElementById('winnerNameDisplay').innerText = "🎉 Winner: " + winner.name;
            bsOffcanvas.show();
            launchConfetti();
            gameState.winner = winner.name;
            console.log(gameState.winner);
    }


    // Save to LocalStorage and update UI
    saveGame(); 
    render();


}

function playAgain() {
    resetGame();
}


function respotBall(id) {
    const ball = gameState.table.find(b => b.id === id);
    if (ball) ball.state = 'active';
}

function markBallsDead() {
    gameState.table.forEach(b => {
        if (b.state === 'killed') b.state = 'dead';
    });
}

function markBallsPocketed() {
    gameState.table.forEach(b => {
        if (b.state === 'selected') b.state = 'pocketed';
    });
}


function switchTurn() {
    gameState.currentTurn = (gameState.currentTurn === 0) ? 1 : 0;
}
