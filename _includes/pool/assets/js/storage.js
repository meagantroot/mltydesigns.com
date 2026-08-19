// Storage Meter

const MAX_BACKUP_FILE_SIZE = 2 * 1024 * 1024;
const MAX_IMPORTED_MATCHES = 50;
const MAX_IMPORT_DEPTH = 20;
const MAX_IMPORT_VALUES = 25000;
const DANGEROUS_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function sanitizeImportedString(value) {
    // Remove all markup, then decode any entities DOMPurify introduced so the
    // stored value remains ordinary text rather than HTML-encoded backup data.
    const sanitized = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
    });
    const decoder = document.createElement("textarea");
    decoder.innerHTML = sanitized;
    return decoder.value;
}

function sanitizeImportedValue(value, state = { count: 0 }, depth = 0) {
    state.count++;
    if (state.count > MAX_IMPORT_VALUES) throw new Error("Backup contains too much data.");
    if (depth > MAX_IMPORT_DEPTH) throw new Error("Backup is nested too deeply.");

    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("Backup contains an invalid number.");
        return value;
    }
    if (typeof value === "string") {
        if (value.length > 2000) throw new Error("Backup contains an oversized text value.");
        return sanitizeImportedString(value);
    }
    if (Array.isArray(value)) {
        return value.map(item => sanitizeImportedValue(item, state, depth + 1));
    }
    if (!isPlainObject(value)) throw new Error("Backup contains an unsupported value.");

    const cleanObject = Object.create(null);
    for (const [key, item] of Object.entries(value)) {
        if (DANGEROUS_OBJECT_KEYS.has(key)) throw new Error("Backup contains an unsafe property.");
        cleanObject[key] = sanitizeImportedValue(item, state, depth + 1);
    }
    return cleanObject;
}

function validateImportedPlayer(player, fieldName) {
    if (!isPlainObject(player)) throw new Error(`${fieldName} must be an object.`);
    if (typeof player.name !== "string" || !player.name.trim() || player.name.length > 50) {
        throw new Error(`${fieldName} must have a name between 1 and 50 characters.`);
    }
}

function validateImportedMatch(match, index) {
    if (!isPlainObject(match)) throw new Error(`History item ${index + 1} must be an object.`);
    if (!Array.isArray(match.players) || match.players.length !== 2) {
        throw new Error(`History item ${index + 1} must contain exactly two players.`);
    }
    validateImportedPlayer(match.players[0], `History item ${index + 1}, player 1`);
    validateImportedPlayer(match.players[1], `History item ${index + 1}, player 2`);
    if (!["8-ball", "9-ball", "10-ball"].includes(match.mode)) {
        throw new Error(`History item ${index + 1} has an unsupported game mode.`);
    }
}

function validateImportedBackup(backup) {
    if (!isPlainObject(backup)) throw new Error("Backup must be a JSON object.");
    // Older exports use null when there was no saved match history.
    if (backup.history === null) backup.history = [];
    if (backup.history !== undefined) {
        if (!Array.isArray(backup.history)) throw new Error("Backup history must be an array.");
        if (backup.history.length > MAX_IMPORTED_MATCHES) {
            throw new Error(`Backup cannot contain more than ${MAX_IMPORTED_MATCHES} matches.`);
        }
        backup.history.forEach(validateImportedMatch);
    }
    if (backup.active !== undefined && backup.active !== null) {
        if (!isPlainObject(backup.active)) throw new Error("Active match must be an object.");
        if (!Array.isArray(backup.active.players) || backup.active.players.length !== 2) {
            throw new Error("Active match must contain exactly two players.");
        }
        validateImportedPlayer(backup.active.players[0], "Active match player 1");
        validateImportedPlayer(backup.active.players[1], "Active match player 2");
    }
}

function updateStorageMeter() {
    // Calculate current localStorage usage (in bytes)
    let used = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        // Each character in UTF-16 uses 2 bytes
        used += (key.length + value.length) * 2;
    }

    // Set the standard localStorage limit (5MB)
    const limit = 5 * 1024 * 1024;

    // Update the UI
    const usedMB = (used / 1024 / 1024).toFixed(5);
    const limitMB = (limit / 1024 / 1024).toFixed(0);

    // Set bar width based on the 5MB cap
    document.getElementById('storage-bar').style.width = Math.min((used / limit * 100), 100) + "%";

    // Update text to show current usage vs the 5MB limit
    document.getElementById('storage-text').innerText = `${usedMB} MB / ${limitMB} MB`;
}

// Clear All History
function clearHistory() {
    if (confirm("Delete all history?")) {
        localStorage.removeItem('pool_match_history'); location.reload();
    }
}

// Export Data
function downloadBackup() {
    const data = { active: gameState, history: JSON.parse(localStorage.getItem('pool_match_history')) };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pool_backup.json"; a.click();
}

function importBackup(e) {
    const file = e.target.files[0];

    // Check if a file was actually selected
    if (!file) return;

    // Hard block: Check if the file extension is .json
    if (!file.name.toLowerCase().endsWith('.json')) {
        alert("Please select a valid .json file.");
        e.target.value = ''; // Reset the input
        return;
    }

    if (file.size > MAX_BACKUP_FILE_SIZE) {
        alert("Backup files cannot be larger than 2 MB.");
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const parsed = JSON.parse(ev.target.result);
            validateImportedBackup(parsed);
            const d = sanitizeImportedValue(parsed);
            
            if (d.active) localStorage.setItem('pool_score_data', JSON.stringify(d.active));
            if (d.history) localStorage.setItem('pool_match_history', JSON.stringify(d.history));
            
            alert("Backup imported successfully!");
            localStorage.removeItem('pool_score_data'); location.reload();
        } catch (err) {
            alert(`Backup import failed: ${err.message}`);
            console.error("Backup Import Error:", err);
        }
    };
    reader.onerror = () => alert("The backup file could not be read.");
    reader.readAsText(file);
}

// Random Game Selection

function rollDiceUI() {
    const diceEl = document.getElementById('pool-dice');
    const options = [8, 9, 10];
    
    // Start animation
    diceEl.classList.add('rolling');
    diceEl.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width: 100%">
                <circle cx="100" cy="100" r="94" fill="black" stroke="#999" stroke-width="2"/>
                <circle cx="100" cy="100" r="45" fill="white"/>
                <text x="100" y="115" font-size="50" text-anchor="middle" fill="black" font-family="Arial" font-weight="bold">?</text>
                </svg>`;

    // Simulate "rolling" time
    setTimeout(() => {
        const result = options[Math.floor(Math.random() * options.length)];
        
        // Stop animation and show result
        diceEl.classList.remove('rolling');

        if (result === 8) {
            diceEl.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width: 100%">
                <circle cx="100" cy="100" r="94" fill="black" stroke="#999" stroke-width="2"/>
                <circle cx="100" cy="100" r="45" fill="white"/>
                <text x="100" y="115" font-size="50" text-anchor="middle" fill="black" font-family="Arial" font-weight="bold">8</text>
                </svg>`;
        } else if (result === 9) {
            diceEl.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width: 100%">
                <defs>
                    <clipPath id="clip">
                    <circle cx="100" cy="100" r="94"/>
                    </clipPath>
                </defs>
                <circle cx="100" cy="100" r="94" fill="white" stroke="#999" stroke-width="2"/>
                <rect x="0" y="45" width="200" height="110" fill="#FDD017" clip-path="url(#clip)"/>
                <circle cx="100" cy="100" r="45" fill="white"/>
                <text x="100" y="115" font-size="50" text-anchor="middle" fill="black" font-family="Arial" font-weight="bold">9</text>
                </svg>`;
        } else {
            diceEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width: 100%">
            <defs>
                <clipPath id="clip">
                <circle cx="100" cy="100" r="94"/>
                </clipPath>
            </defs>
            <circle cx="100" cy="100" r="94" fill="white" stroke="#999" stroke-width="2"/>
            <rect x="0" y="45" width="200" height="110" fill="#2B65EC" clip-path="url(#clip)"/>
            <circle cx="100" cy="100" r="45" fill="white"/>
            <text x="100" y="115" font-size="50" text-anchor="middle" fill="black" font-family="Arial" font-weight="bold">10</text>
            </svg>`;
        }

        
    }, 900);
}

function setGameModeFromDice(num) {
    gameState.mode = `${num}-ball`;
    console.log("Game mode set to:", gameState.mode);
    // Call your existing render function here if needed
    if (typeof renderGame === "function") renderGame();
}
