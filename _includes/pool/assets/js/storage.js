// Storage Meter

const MAX_BACKUP_FILE_SIZE = 2 * 1024 * 1024;
const MAX_IMPORTED_MATCHES = 50;
const MAX_IMPORT_DEPTH = 20;
const MAX_IMPORT_VALUES = 25000;
const BACKUP_SCHEMA_VERSION = 1;
const DANGEROUS_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SUPPORTED_GAME_MODES = new Set(["8-ball", "9-ball", "10-ball"]);

function readStoredJson(key, fallback, options = {}) {
    const rawValue = localStorage.getItem(key);
    if (rawValue === null) return fallback;

    try {
        return JSON.parse(rawValue);
    } catch (error) {
        console.error(`Invalid JSON stored in ${key}:`, error);
        if (options.removeInvalid) localStorage.removeItem(key);
        if (typeof options.onError === "function") options.onError(error);
        return fallback;
    }
}

function readStoredArray(key, options = {}) {
    const value = readStoredJson(key, [], options);
    if (Array.isArray(value)) return value;

    console.error(`Invalid data stored in ${key}: expected an array.`);
    if (options.removeInvalid) localStorage.removeItem(key);
    if (typeof options.onError === "function") options.onError(new Error("Expected an array."));
    return [];
}

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

function validateOptionalInteger(object, key, fieldName, min = 0, max = 10000) {
    if (object[key] === undefined || object[key] === null) return;
    if (!Number.isInteger(object[key]) || object[key] < min || object[key] > max) {
        throw new Error(`${fieldName}.${key} must be an integer between ${min} and ${max}.`);
    }
}

function validateOptionalBoolean(object, key, fieldName) {
    if (object[key] === undefined || typeof object[key] === "boolean") return;
    throw new Error(`${fieldName}.${key} must be true or false.`);
}

function validateImportedPlayer(player, fieldName, mode) {
    if (!isPlainObject(player)) throw new Error(`${fieldName} must be an object.`);
    if (typeof player.name !== "string" || !player.name.trim() || player.name.length > 50) {
        throw new Error(`${fieldName} must have a name between 1 and 50 characters.`);
    }

    const skillMinimum = mode === "9-ball" ? 1 : 2;
    const skillMaximum = mode === "9-ball" ? 9 : 7;
    validateOptionalInteger(player, "skill", fieldName, skillMinimum, skillMaximum);

    [
        "score", "target", "racksWon", "defensiveShots", "scratches",
        "fouls", "miscues", "escapes", "kickshots", "safeties",
        "count8onbreak", "count9onsnap", "breakandrun", "breakandruns",
        "timeouts", "errors"
    ].forEach(key => validateOptionalInteger(player, key, fieldName));
    validateOptionalBoolean(player, "won", fieldName);
}

function validateBallList(value, fieldName) {
    if (value === undefined) return;
    if (!Array.isArray(value) || value.length > 15) {
        throw new Error(`${fieldName} must be an array containing no more than 15 balls.`);
    }
    value.forEach((ball, index) => {
        if (!Number.isInteger(ball) || ball < 1 || ball > 15) {
            throw new Error(`${fieldName}[${index}] must be a ball number between 1 and 15.`);
        }
    });
}

function validateInningData(value, fieldName) {
    if (value === undefined || value === null) return;
    if (!Array.isArray(value) && !isPlainObject(value)) {
        throw new Error(`${fieldName} must be an array or object.`);
    }

    const innings = Array.isArray(value) ? value : Object.values(value);
    if (innings.length > 1000) throw new Error(`${fieldName} contains too many innings.`);

    innings.forEach((inning, index) => {
        if (!isPlainObject(inning)) throw new Error(`${fieldName}[${index}] must be an object.`);
        ["0", "1"].forEach(playerId => {
            const playerInning = inning[playerId];
            if (playerInning === undefined) return;
            if (!isPlainObject(playerInning)) {
                throw new Error(`${fieldName}[${index}].${playerId} must be an object.`);
            }
            validateBallList(playerInning.balls, `${fieldName}[${index}].${playerId}.balls`);
            validateOptionalInteger(playerInning, "points", `${fieldName}[${index}].${playerId}`);
            validateOptionalInteger(playerInning, "rack", `${fieldName}[${index}].${playerId}`, 0, 1000);
        });
    });
}

function validateImportedMatch(match, index) {
    if (!isPlainObject(match)) throw new Error(`History item ${index + 1} must be an object.`);
    if (!SUPPORTED_GAME_MODES.has(match.mode)) {
        throw new Error(`History item ${index + 1} has an unsupported game mode.`);
    }
    if (!Array.isArray(match.players) || match.players.length !== 2) {
        throw new Error(`History item ${index + 1} must contain exactly two players.`);
    }
    validateImportedPlayer(match.players[0], `History item ${index + 1}, player 1`, match.mode);
    validateImportedPlayer(match.players[1], `History item ${index + 1}, player 2`, match.mode);
    validateOptionalInteger(match, "innings", `History item ${index + 1}`);
    validateOptionalInteger(match, "racks", `History item ${index + 1}`);
    validateInningData(match.inningdata, `History item ${index + 1}.inningdata`);
}

function validateActiveMatch(active) {
    if (!SUPPORTED_GAME_MODES.has(active.mode)) {
        throw new Error("Active match has an unsupported game mode.");
    }
    if (!Array.isArray(active.players) || active.players.length !== 2) {
        throw new Error("Active match must contain exactly two players.");
    }
    validateImportedPlayer(active.players[0], "Active match player 1", active.mode);
    validateImportedPlayer(active.players[1], "Active match player 2", active.mode);
    validateOptionalInteger(active, "currentTurn", "Active match", 0, 1);
    validateOptionalInteger(active, "currentInningIndex", "Active match");
    validateOptionalInteger(active, "currentRack", "Active match", 1, 1000);
    validateOptionalInteger(active, "rackShotCount", "Active match");
    validateInningData(active.innings, "Active match innings");

    if (active.history !== undefined && (!Array.isArray(active.history) || active.history.length > 20)) {
        throw new Error("Active match undo history must contain no more than 20 entries.");
    }
    if (active.table !== undefined) {
        if (!Array.isArray(active.table) || active.table.length > 15) {
            throw new Error("Active match table must contain no more than 15 balls.");
        }
        const allowedStates = new Set(["active", "selected", "pocketed", "killed", "dead"]);
        active.table.forEach((ball, index) => {
            if (!isPlainObject(ball) || !Number.isInteger(ball.id) || ball.id < 1 || ball.id > 15) {
                throw new Error(`Active match table ball ${index + 1} is invalid.`);
            }
            if (!allowedStates.has(ball.state)) {
                throw new Error(`Active match table ball ${index + 1} has an invalid state.`);
            }
        });
    }
}

function validateImportedBackup(backup) {
    if (!isPlainObject(backup)) throw new Error("Backup must be a JSON object.");
    // Backups created before v1.3.6 did not include a schema version.
    if (backup.schemaVersion === undefined) backup.schemaVersion = BACKUP_SCHEMA_VERSION;
    if (backup.schemaVersion !== BACKUP_SCHEMA_VERSION) {
        throw new Error(`Unsupported backup schema version: ${backup.schemaVersion}.`);
    }
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
        // Legacy/idle exports contain only initialized counters and do not
        // represent a match that can be resumed.
        if (backup.active.players === undefined) {
            backup.active = null;
            return;
        }
        validateActiveMatch(backup.active);
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
    const hasActiveMatch = Array.isArray(gameState?.players) && gameState.players.length === 2;
    const data = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        active: hasActiveMatch ? gameState : null,
        history: readStoredArray('pool_match_history', { removeInvalid: true })
    };
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
            
            if (d.active) {
                localStorage.setItem('pool_score_data', JSON.stringify(d.active));
            } else {
                localStorage.removeItem('pool_score_data');
            }
            if (d.history) localStorage.setItem('pool_match_history', JSON.stringify(d.history));
            
            alert("Backup imported successfully!");
            location.reload();
        } catch (err) {
            alert(`Backup import failed: ${err.message}`);
            console.error("Backup Import Error:", err);
        }
    };
    reader.onerror = () => alert("The backup file could not be read.");
    reader.readAsText(file);
}

// Expose the storage contract to the dependency-free Node.js regression tests.
// This branch is ignored when Jekyll embeds the file in the browser bundle.
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        BACKUP_SCHEMA_VERSION,
        readStoredJson,
        readStoredArray,
        sanitizeImportedValue,
        validateImportedBackup,
        validateActiveMatch
    };
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
