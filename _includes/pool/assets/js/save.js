// Save Game on Win

function saveGame() {
    PoolStorage.saveActiveMatch(gameState);
    render(); updateStorageMeter(); updateLifetimeStats();displayHistory();
}

// Archive Game
function archiveMatch() {
    const history = PoolStorage.loadHistory();
    history.unshift({
        matchId: PoolStorage.createMatchId(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: gameState.mode,
        winner: gameState.winner,
        innings: (gameState.currentInningIndex -1),
        inningdata: gameState.innings,
        racks: (gameState.currentRack - 1),
        players: gameState.players.map(p => ({ 
            name: p.name,
            playerId: p.playerId,
            skill: p.skill,
            score: p.score,
            target: p.target,
            scratches: p.scratches,
            fouls: p.fouls,
            miscues: p.miscues,
            escapes: p.escapes,
            kickshots: p.kickshots,
            safeties: p.defensiveShots,
            won: p.score >= p.target,
            count8onbreak: p.count8onbreak,
            count9onsnap: p.count9onsnap,
            breakandrun: p.breakandruns
        }))
    });
    PoolStorage.saveHistory(history);
    console.log(gameState.winner);
}

function quitMatchEarly() {
    if (confirm("Discard match data and exit to the start menu?")) {
        resetGame();
    }
}

function resetGame() {

    const winner = gameState.players.find(player => player.score >= player.target);

    if (winner) {
        archiveMatch();
        updateLifetimeStats();
        displayHistory();
        updateStorageMeter();
    }
    
    // Hide the game board, show the player entry form
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('setup-form').style.display = 'block';
    
    // Clear the localStorage so a fresh game doesn't load the old one
    PoolStorage.clearActiveMatch();
    
    // Reset any local variables if necessary
    gameState = null;
    updateLandscapeScoreboard();
}

// This creates a copy so the history doesn't change when the current gameState changes later.

function saveHistory() {
    
    const stateCopy = JSON.parse(JSON.stringify(gameState));
    delete stateCopy.history; 
    gameState.history.push(stateCopy);
    if (gameState.history.length > 20) gameState.history.shift();
}
