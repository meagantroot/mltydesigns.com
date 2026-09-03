// This function starts the game

document.addEventListener('gesturestart', function(e) {
  e.preventDefault();
}, { passive: false });


let gameState = null;
let mode;

// Ensure gameState exists before setting properties
if (!gameState) {
    gameState = {}; 
}

// Set Theme Default
if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', 'light');
}

// Setup Game Counters
gameState.currentInningIndex = 0;
gameState.rackShotCount = 0;

window.onload = function() { loadGame(); displayHistory(); updateLifetimeStats(); updateStorageMeter(); };


// Move helper functions to the top so they are globally available
const clean = (str) => {
    if (!str) return "";
    const alphaOnly = str.replace(/[^a-z0-9 ]/gi, "");
    return DOMPurify.sanitize(alphaOnly);
};

// Encode untrusted text before placing it inside an HTML template string.
// Prefer textContent when building new UI, but this protects the existing
// innerHTML-based history and statistics renderers.
const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

// Define game state variable globally
// let gameState = {};

function setNames() {
    const p1NameInput = document.getElementById('p1Name');
    const p2NameInput = document.getElementById('p2Name');

    if (!p1NameInput.value || !p2NameInput.value) return;

    // Update the labels in your radio button selection
    document.getElementById('p1startsLabelText').textContent = clean(p1NameInput.value);
    document.getElementById('p2startsLabelText').textContent = clean(p2NameInput.value);
}

function startGame() {
    // Re-grab the Game Mode and Style (These were missing!)
    const mode = document.querySelector('input[name="gameMode"]:checked').value;
    const isSingleGame = document.getElementById('gameStyleSingle').checked;
    const isSuddenDeath = document.getElementById('gameStyleSuddenDeath').checked;

    // Grab and clean the names/skills
    const p1NameInput = document.getElementById('p1Name');
    const p2NameInput = document.getElementById('p2Name');
    const p1SkillInput = document.getElementById('p1Skill');
    const p2SkillInput = document.getElementById('p2Skill');
    
    const p1Clean = clean(p1NameInput.value) || "Player 1";
    const p2Clean = clean(p2NameInput.value) || "Player 2";
    const p1S = parseInt(p1SkillInput.value);
    const p2S = parseInt(p2SkillInput.value);
    const p1ProfileId = document.getElementById('p1Profile')?.value || undefined;
    const p2ProfileId = document.getElementById('p2Profile')?.value || undefined;

    // Check the Radio Buttons for the winner
    const p1Starts = document.getElementById('p1Starts').checked;

    let player1, player2;
    if (p1Starts) {
        player1 = { name: p1Clean, skill: p1S, playerId: p1ProfileId };
        player2 = { name: p2Clean, skill: p2S, playerId: p2ProfileId };
    } else {
        player1 = { name: p2Clean, skill: p2S, playerId: p2ProfileId };
        player2 = { name: p1Clean, skill: p1S, playerId: p1ProfileId };
    }


    // Initialize...
    // console.log(`${player1.name} goes first!`);    // Skill 1-3 = 2 timeouts, 4+ = 1 timeout
    const getInitialTimeouts = (skill) => (skill <= 3 ? 2 : 1);

gameState = {
    mode: mode,
    currentTurn: 0,
    currentInningIndex: 0,
    currentRack: 1,
    rackShotCount: 0,
    history: [],
    table: Array.from({length: 15}, (_, i) => ({ id: i + 1, state: 'active' })),
    players: [
        { 
            name: clean(player1.name),
            playerId: player1.playerId,
            skill: player1.skill,
            target: isSingleGame ? 1 : (WIN_CHARTS[mode][player2.skill] && WIN_CHARTS[mode][player2.skill][player1.skill]) || (WIN_CHARTS[mode][player1.skill]),
            score: 0,
            racksWon: 0,
            defensiveShots: 0,
            scratches: 0,
            fouls: 0,
            miscues: 0,
            escapes: 0,
            kickshots: 0,
            count9onsnap: 0,
            count8onbreak: 0,
            breakandruns: 0,
            timeouts: getInitialTimeouts(player1.skill),
            group: null 
        },
        { 
            name: clean(player2.name),
            playerId: player2.playerId,
            skill: player2.skill,
            target: isSingleGame ? 1 : (WIN_CHARTS[mode][player1.skill] && WIN_CHARTS[mode][player1.skill][player2.skill]) || (WIN_CHARTS[mode][player2.skill]),
            score: 0,
            racksWon: 0,
            defensiveShots: 0,
            scratches: 0,
            fouls: 0,
            miscues: 0,
            escapes: 0,
            kickshots: 0,
            count9onsnap: 0,
            count8onbreak: 0,
            breakandruns: 0,
            errors: 0,
            timeouts: getInitialTimeouts(player2.skill),
            group: null 
        }
    ],
    innings: []
};
//    console.log("Game Starting!", player1.name, "goes first.");
    saveGame(); 
    showGameUI();
}

function setNames() {
    const p1NameInput = document.getElementById('p1Name');
    const p2NameInput = document.getElementById('p2Name');
    const p1SkillInput = document.getElementById('p1Skill');
    const p2SkillInput = document.getElementById('p2Skill');
    const p1ProfileId = document.getElementById('p1Profile')?.value;
    const p2ProfileId = document.getElementById('p2Profile')?.value;
    
    // Note: If this is the first time running, p1Starts might be null. 
    // We add a check to prevent errors.
    const p1StartsBtn = document.getElementById('p1Starts');
    const p1Selected = p1StartsBtn ? p1StartsBtn.checked : true;

    if (!p1ProfileId || !p2ProfileId) {
        alert('Choose both players before starting the match.');
        return;
    }
    if (p1ProfileId === p2ProfileId) {
        alert('Choose two different players before starting the match.');
        return;
    }

    const clean = (str) => {
        const alphaOnly = str.replace(/[^a-z0-9 ]/gi, "");
        return DOMPurify.sanitize(alphaOnly);
    };

    const p1Clean = clean(p1NameInput.value);
    const p2Clean = clean(p2NameInput.value);
    const p1S = parseInt(p1SkillInput.value);
    const p2S = parseInt(p2SkillInput.value);

    if (p1Clean === "" || p2Clean === "") {
        alert('The selected player profile is invalid. Please select the player again.');
        return;
    }

    // Update Radio Labels
    const p1RadioLabel = document.getElementById('p1startsLabelText');
    const p2RadioLabel = document.getElementById('p2startsLabelText');
    if (p1RadioLabel) p1RadioLabel.textContent = p1Clean;
    if (p2RadioLabel) p2RadioLabel.textContent = p2Clean;

    // Update Coin Flip UI labels with NULL-SAFETY checks
    const elName = document.getElementById('coin-p1-name');
    const elLabel1 = document.getElementById('coin-p1-label');
    const elLabel2 = document.getElementById('coin-p2-label');
    const elStatus = document.getElementById('coin-p1-status');

    if (elName) elName.textContent = p1Clean;
    if (elLabel1) elLabel1.textContent = p1Clean;
    if (elLabel2) elLabel2.textContent = p2Clean;
    if (elStatus) elStatus.textContent = p1Clean;

    // Set internal player objects
    let player1, player2;
    switch (p1Selected) {
        case true:
            player1 = { name: p1Clean, skill: p1S, playerId: p1ProfileId };
            player2 = { name: p2Clean, skill: p2S, playerId: p2ProfileId };
            break;
        case false:
            player1 = { name: p2Clean, skill: p2S, playerId: p2ProfileId };
            player2 = { name: p1Clean, skill: p1S, playerId: p1ProfileId };
            break;
    }

    // TRIGGER THE OFFCANVAS MANUALLY
    // This ensures it only opens if the validation above passed
    const offcanvasElement = document.getElementById('shootsfirst');
    if (offcanvasElement) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasElement);
        bsOffcanvas.show();
    }
}
