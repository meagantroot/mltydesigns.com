// Storage Meter

const MAX_BACKUP_FILE_SIZE = 2 * 1024 * 1024;
const MAX_IMPORTED_MATCHES = 250;
const MAX_PLAYER_PROFILES = 100;
const MAX_IMPORT_DEPTH = 20;
const MAX_IMPORT_VALUES = 25000;
const BACKUP_SCHEMA_VERSION = 2;
const LEGACY_BACKUP_SCHEMA_VERSION = 1;
const POOL_DATASET_KEY = "pool_dataset";
const POOL_DATASET_PREVIOUS_KEY = "pool_dataset_previous";
const POOL_DATASET_PENDING_KEY = "pool_dataset_pending";
const LEGACY_ACTIVE_KEY = "pool_score_data";
const LEGACY_HISTORY_KEY = "pool_match_history";
const DANGEROUS_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SUPPORTED_GAME_MODES = new Set(["8-ball", "9-ball", "10-ball"]);
const SAFE_PLAYER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const DEFAULT_PROFILE_SKILL_LEVELS = Object.freeze({
    "8-ball": 4,
    "9-ball": 5,
    "10-ball": 4
});

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
    // Remove markup, decode entities, then sanitize again so encoded tags cannot
    // become literal markup in the normalized dataset.
    const textOnlyOptions = {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
    };
    const sanitized = DOMPurify.sanitize(value, textOnlyOptions);
    const decoder = document.createElement("textarea");
    decoder.innerHTML = sanitized;
    return DOMPurify.sanitize(decoder.value, textOnlyOptions);
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
    if (player.playerId !== undefined && (
        typeof player.playerId !== "string" || !SAFE_PLAYER_ID.test(player.playerId)
    )) {
        throw new Error(`${fieldName}.playerId must be a non-empty identifier.`);
    }
}

function normalizePlayerName(name) {
    return String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function validatePlayerProfile(profile, index) {
    const fieldName = `Player profile ${index + 1}`;
    if (!isPlainObject(profile)) throw new Error(`${fieldName} must be an object.`);
    if (typeof profile.playerId !== "string" || !SAFE_PLAYER_ID.test(profile.playerId)) {
        throw new Error(`${fieldName} must have a valid player ID.`);
    }
    if (typeof profile.name !== "string" || !profile.name.trim() || profile.name.length > 50) {
        throw new Error(`${fieldName} must have a name between 1 and 50 characters.`);
    }
    if (!isPlainObject(profile.skillLevels)) throw new Error(`${fieldName}.skillLevels must be an object.`);
    ["8-ball", "9-ball", "10-ball"].forEach(mode => {
        const skill = profile.skillLevels[mode];
        if (skill === undefined || skill === null) return;
        const minimum = mode === "9-ball" ? 1 : 2;
        const maximum = mode === "9-ball" ? 9 : 7;
        if (!Number.isInteger(skill) || skill < minimum || skill > maximum) {
            throw new Error(`${fieldName} has an invalid ${mode} skill level.`);
        }
    });
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
    if (match.matchId !== undefined && (
        typeof match.matchId !== "string" || !match.matchId.trim() || match.matchId.length > 100
    )) {
        throw new Error(`History item ${index + 1} has an invalid match ID.`);
    }
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
    if (backup.profiles !== undefined) {
        if (!Array.isArray(backup.profiles)) throw new Error("Player profiles must be an array.");
        if (backup.profiles.length > MAX_PLAYER_PROFILES) {
            throw new Error(`A dataset cannot contain more than ${MAX_PLAYER_PROFILES} player profiles.`);
        }
        const profileIds = new Set();
        backup.profiles.forEach((profile, index) => {
            validatePlayerProfile(profile, index);
            if (profileIds.has(profile.playerId)) throw new Error("Player profile IDs must be unique.");
            profileIds.add(profile.playerId);
        });
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

function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (isPlainObject(value)) {
        const entries = Object.keys(value)
            .sort()
            .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
        return `{${entries.join(",")}}`;
    }
    return JSON.stringify(value);
}

function fingerprintMatch(match) {
    const content = Object.assign({}, match);
    delete content.matchId;
    let hash = 2166136261;
    const serialized = stableStringify(content);
    for (let index = 0; index < serialized.length; index++) {
        hash ^= serialized.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `legacy-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function createMatchId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureHistoryMatchIds(history) {
    const usedIds = new Set();
    return history.map(match => {
        const upgraded = Object.assign({}, match);
        let matchId = typeof upgraded.matchId === "string" && upgraded.matchId.trim()
            ? upgraded.matchId.trim()
            : fingerprintMatch(upgraded);
        let suffix = 2;
        while (usedIds.has(matchId)) {
            matchId = `${fingerprintMatch(upgraded)}-${suffix++}`;
        }
        upgraded.matchId = matchId;
        usedIds.add(matchId);
        return upgraded;
    });
}

function upgradeBackupToCurrent(backup) {
    if (!isPlainObject(backup)) throw new Error("Backup must be a JSON object.");
    const sourceVersion = backup.schemaVersion === undefined
        ? LEGACY_BACKUP_SCHEMA_VERSION
        : backup.schemaVersion;
    if (sourceVersion !== LEGACY_BACKUP_SCHEMA_VERSION && sourceVersion !== BACKUP_SCHEMA_VERSION) {
        throw new Error(`Unsupported backup schema version: ${sourceVersion}.`);
    }

    const upgraded = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        updatedAt: typeof backup.updatedAt === "string" ? backup.updatedAt : new Date().toISOString(),
        active: backup.active ?? null,
        history: ensureHistoryMatchIds(backup.history ?? []),
        profiles: Array.isArray(backup.profiles) ? backup.profiles.map(profile => Object.assign({}, profile, {
            skillLevels: Object.assign({}, profile.skillLevels)
        })) : []
    };
    if (upgraded.active && upgraded.active.players === undefined) upgraded.active = null;
    validateImportedBackup(upgraded);
    return upgraded;
}

function sameMatch(left, right) {
    return stableStringify(left) === stableStringify(right);
}

function matchContentKey(match) {
    const content = Object.assign({}, match);
    delete content.matchId;
    return stableStringify(content);
}

function matchGameplayKey(match) {
    const content = Object.assign({}, match);
    delete content.matchId;
    if (Array.isArray(content.players)) {
        content.players = content.players.map(player => {
            const gameplayPlayer = Object.assign({}, player);
            delete gameplayPlayer.name;
            delete gameplayPlayer.playerId;
            return gameplayPlayer;
        });
    }
    return stableStringify(content);
}

function mergeMatchHistories(existingHistory, importedHistory) {
    const merged = ensureHistoryMatchIds(existingHistory);
    const byId = new Map(merged.map(match => [match.matchId, match]));
    const contentKeys = new Set(merged.map(matchContentKey));
    let added = 0;
    let duplicates = 0;
    let conflicts = 0;

    ensureHistoryMatchIds(importedHistory).forEach(importedMatch => {
        const existing = byId.get(importedMatch.matchId);
        const importedContentKey = matchContentKey(importedMatch);
        if (!existing) {
            if (contentKeys.has(importedContentKey)) {
                duplicates++;
                return;
            }
            merged.push(importedMatch);
            byId.set(importedMatch.matchId, importedMatch);
            contentKeys.add(importedContentKey);
            added++;
            return;
        }
        if (sameMatch(existing, importedMatch) || matchGameplayKey(existing) === matchGameplayKey(importedMatch)) {
            duplicates++;
            return;
        }
        if (contentKeys.has(importedContentKey)) {
            duplicates++;
            return;
        }

        conflicts++;
        const originalId = importedMatch.matchId;
        let suffix = 2;
        let replacementId = `${originalId}-imported-${suffix}`;
        while (byId.has(replacementId)) replacementId = `${originalId}-imported-${++suffix}`;
        const preservedConflict = Object.assign({}, importedMatch, { matchId: replacementId });
        merged.push(preservedConflict);
        byId.set(replacementId, preservedConflict);
        contentKeys.add(matchContentKey(preservedConflict));
        added++;
    });

    if (merged.length > MAX_IMPORTED_MATCHES) {
        throw new Error(`Merged history cannot contain more than ${MAX_IMPORTED_MATCHES} matches.`);
    }
    return { history: merged, added, duplicates, conflicts };
}

function mergePlayerProfiles(existingProfiles, importedProfiles) {
    const profiles = existingProfiles.map(profile => Object.assign({}, profile, {
        skillLevels: Object.assign({}, profile.skillLevels)
    }));
    const byId = new Map(profiles.map(profile => [profile.playerId, profile]));
    const idMap = new Map();
    let added = 0;
    let merged = 0;
    let conflicts = 0;

    importedProfiles.forEach(importedProfile => {
        const sameId = byId.get(importedProfile.playerId);
        if (sameId && normalizePlayerName(sameId.name) === normalizePlayerName(importedProfile.name)) {
            const skillConflict = ["8-ball", "9-ball", "10-ball"].some(mode =>
                sameId.skillLevels[mode] != null &&
                importedProfile.skillLevels[mode] != null &&
                sameId.skillLevels[mode] !== importedProfile.skillLevels[mode]
            );
            if (!skillConflict) {
                idMap.set(importedProfile.playerId, sameId.playerId);
                ["8-ball", "9-ball", "10-ball"].forEach(mode => {
                    if (sameId.skillLevels[mode] == null && importedProfile.skillLevels[mode] != null) {
                        sameId.skillLevels[mode] = importedProfile.skillLevels[mode];
                    }
                });
                merged++;
                return;
            }
        }

        let playerId = importedProfile.playerId;
        if (byId.has(playerId)) {
            playerId = createMatchId();
            conflicts++;
        }
        const addedProfile = Object.assign({}, importedProfile, {
            playerId,
            skillLevels: Object.assign({}, importedProfile.skillLevels)
        });
        idMap.set(importedProfile.playerId, playerId);
        profiles.push(addedProfile);
        byId.set(playerId, addedProfile);
        added++;
    });

    if (profiles.length > MAX_PLAYER_PROFILES) {
        throw new Error(`Merged data cannot contain more than ${MAX_PLAYER_PROFILES} player profiles.`);
    }
    return { profiles, idMap, added, merged, conflicts };
}

function remapDatasetPlayerIds(dataset, idMap) {
    const remapPlayer = player => {
        if (player?.playerId && idMap.has(player.playerId)) player.playerId = idMap.get(player.playerId);
    };
    dataset.history.forEach(match => match.players.forEach(remapPlayer));
    if (dataset.active?.players) dataset.active.players.forEach(remapPlayer);
    return dataset;
}

function validatePoolDataset(dataset) {
    validateImportedBackup(dataset);
    return dataset;
}

const PoolStorage = {
    emptyDataset() {
        return {
            schemaVersion: BACKUP_SCHEMA_VERSION,
            updatedAt: new Date().toISOString(),
            active: null,
            history: [],
            profiles: []
        };
    },

    parseDatasetKey(key) {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        const parsed = JSON.parse(raw);
        const sanitized = sanitizeImportedValue(parsed);
        return validatePoolDataset(upgradeBackupToCurrent(sanitized));
    },

    loadDataset() {
        try {
            const current = this.parseDatasetKey(POOL_DATASET_KEY);
            if (current) {
                const storedCurrent = localStorage.getItem(POOL_DATASET_KEY);
                if (storedCurrent !== JSON.stringify(current)) {
                    return this.writeDataset(current, { preservePrevious: false });
                }
                return current;
            }
        } catch (error) {
            console.error("Current pool dataset is invalid:", error);
            try {
                const previous = this.parseDatasetKey(POOL_DATASET_PREVIOUS_KEY);
                if (previous) {
                    this.writeDataset(previous, { preservePrevious: false });
                    return previous;
                }
            } catch (recoveryError) {
                console.error("Previous pool dataset is also invalid:", recoveryError);
            }
        }

        for (const recoveryKey of [POOL_DATASET_PENDING_KEY, POOL_DATASET_PREVIOUS_KEY]) {
            try {
                const recoveryDataset = this.parseDatasetKey(recoveryKey);
                if (recoveryDataset) {
                    const recovered = this.writeDataset(recoveryDataset, { preservePrevious: false });
                    localStorage.removeItem(POOL_DATASET_PENDING_KEY);
                    return recovered;
                }
            } catch (error) {
                console.error(`Pool recovery copy ${recoveryKey} is invalid:`, error);
            }
        }

        let legacyActive = readStoredJson(LEGACY_ACTIVE_KEY, null);
        let legacyHistory = readStoredArray(LEGACY_HISTORY_KEY);
        try {
            if (legacyActive) legacyActive = sanitizeImportedValue(legacyActive);
            if (legacyActive?.players === undefined) legacyActive = null;
            if (legacyActive) validateActiveMatch(legacyActive);
        } catch (error) {
            console.error("Legacy active match is invalid and was left in its original key:", error);
            legacyActive = null;
        }
        const sanitizedLegacyHistory = [];
        legacyHistory.forEach((match, index) => {
            try {
                const sanitizedMatch = sanitizeImportedValue(match);
                validateImportedMatch(sanitizedMatch, index);
                sanitizedLegacyHistory.push(sanitizedMatch);
            } catch (error) {
                console.error(`Legacy history item ${index + 1} is invalid and remains in the original key:`, error);
            }
        });
        const legacyDataset = upgradeBackupToCurrent({
            schemaVersion: LEGACY_BACKUP_SCHEMA_VERSION,
            active: legacyActive,
            history: sanitizedLegacyHistory
        });
        this.writeDataset(legacyDataset);
        return legacyDataset;
    },

    writeDataset(dataset, options = {}) {
        const normalized = upgradeBackupToCurrent(dataset);
        normalized.updatedAt = new Date().toISOString();
        const serialized = JSON.stringify(normalized);
        try {
            localStorage.setItem(POOL_DATASET_PENDING_KEY, serialized);
            const pending = this.parseDatasetKey(POOL_DATASET_PENDING_KEY);
            if (!pending) throw new Error("Pending dataset verification failed.");
            const current = localStorage.getItem(POOL_DATASET_KEY);
            if (current !== null && options.preservePrevious !== false) {
                localStorage.setItem(POOL_DATASET_PREVIOUS_KEY, current);
            }
            localStorage.setItem(POOL_DATASET_KEY, serialized);
            localStorage.removeItem(POOL_DATASET_PENDING_KEY);
            return normalized;
        } catch (error) {
            localStorage.removeItem(POOL_DATASET_PENDING_KEY);
            throw new Error(`Pool data could not be saved: ${error.message}`);
        }
    },

    loadActiveMatch() {
        return this.loadDataset().active;
    },

    saveActiveMatch(active) {
        const dataset = this.loadDataset();
        dataset.active = active;
        return this.writeDataset(dataset).active;
    },

    clearActiveMatch() {
        const dataset = this.loadDataset();
        dataset.active = null;
        const saved = this.writeDataset(dataset, { preservePrevious: false });
        localStorage.setItem(POOL_DATASET_PREVIOUS_KEY, JSON.stringify(saved));
        localStorage.removeItem(LEGACY_ACTIVE_KEY);
    },

    loadHistory() {
        return this.loadDataset().history;
    },

    saveHistory(history) {
        if (!Array.isArray(history) || history.length > MAX_IMPORTED_MATCHES) {
            throw new Error(`Match history cannot contain more than ${MAX_IMPORTED_MATCHES} matches.`);
        }
        const dataset = this.loadDataset();
        dataset.history = ensureHistoryMatchIds(history);
        return this.writeDataset(dataset).history;
    },

    loadProfiles() {
        return this.loadDataset().profiles;
    },

    saveProfiles(profiles) {
        if (!Array.isArray(profiles) || profiles.length > MAX_PLAYER_PROFILES) {
            throw new Error(`Player profiles cannot contain more than ${MAX_PLAYER_PROFILES} entries.`);
        }
        const dataset = this.loadDataset();
        dataset.profiles = profiles;
        return this.writeDataset(dataset).profiles;
    },

    upsertProfile(profile) {
        const dataset = this.loadDataset();
        const normalizedName = normalizePlayerName(profile.name);
        let existing = profile.playerId
            ? dataset.profiles.find(item => item.playerId === profile.playerId)
            : dataset.profiles.find(item => normalizePlayerName(item.name) === normalizedName);
        if (!existing) {
            existing = {
                playerId: createMatchId(),
                name: profile.name.trim(),
                skillLevels: {},
                createdAt: new Date().toISOString()
            };
            dataset.profiles.push(existing);
        }
        existing.name = profile.name.trim();
        existing.skillLevels = Object.assign(
            {},
            DEFAULT_PROFILE_SKILL_LEVELS,
            existing.skillLevels,
            profile.skillLevels || {}
        );
        existing.updatedAt = new Date().toISOString();
        this.writeDataset(dataset);
        return existing;
    },

    deleteProfile(playerId) {
        const dataset = this.loadDataset();
        dataset.profiles = dataset.profiles.filter(profile => profile.playerId !== playerId);
        this.writeDataset(dataset);
    },

    mapHistoryNameToProfile(sourceName, playerId) {
        const dataset = this.loadDataset();
        const profile = dataset.profiles.find(item => item.playerId === playerId);
        if (!profile) throw new Error("The selected player profile no longer exists.");
        const normalizedSource = normalizePlayerName(sourceName);
        let mapped = 0;
        dataset.history.forEach(match => match.players.forEach(player => {
            if (normalizePlayerName(player.name) === normalizedSource &&
                (player.playerId !== playerId || player.name !== profile.name)) {
                player.playerId = playerId;
                player.name = profile.name;
                mapped++;
            }
        }));
        if (dataset.active?.players) dataset.active.players.forEach(player => {
            if (normalizePlayerName(player.name) === normalizedSource) {
                player.playerId = playerId;
                player.name = profile.name;
            }
        });
        this.writeDataset(dataset);
        return mapped;
    },

    mapExactProfileNames() {
        const dataset = this.loadDataset();
        const profilesByName = new Map(dataset.profiles.map(profile => [
            normalizePlayerName(profile.name), profile
        ]));
        let mapped = 0;
        dataset.history.forEach(match => match.players.forEach(player => {
            const profile = profilesByName.get(normalizePlayerName(player.name));
            if (profile && (player.playerId !== profile.playerId || player.name !== profile.name)) {
                player.playerId = profile.playerId;
                player.name = profile.name;
                mapped++;
            }
        }));
        this.writeDataset(dataset);
        return mapped;
    },

    createProfilesFromHistory() {
        const dataset = this.loadDataset();
        const profilesByName = new Map(dataset.profiles.map(profile => [
            normalizePlayerName(profile.name), profile
        ]));
        let created = 0;
        let mapped = 0;

        dataset.history.forEach(match => match.players.forEach(player => {
            const normalizedName = normalizePlayerName(player.name);
            if (!normalizedName) return;
            let profile = profilesByName.get(normalizedName);
            if (!profile) {
                profile = {
                    playerId: createMatchId(),
                    name: player.name.trim(),
                    skillLevels: {},
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                dataset.profiles.push(profile);
                profilesByName.set(normalizedName, profile);
                created++;
            }
            if (profile.skillLevels[match.mode] == null && Number.isInteger(player.skill)) {
                profile.skillLevels[match.mode] = player.skill;
            }
            if (player.playerId !== profile.playerId || player.name !== profile.name) {
                player.playerId = profile.playerId;
                player.name = profile.name;
                mapped++;
            }
        }));

        this.writeDataset(dataset);
        return { created, mapped };
    },

    deleteMatch(matchId) {
        const dataset = this.loadDataset();
        const originalLength = dataset.history.length;
        dataset.history = dataset.history.filter(match => match.matchId !== matchId);
        if (dataset.history.length === originalLength) return false;
        this.writeDataset(dataset);
        return true;
    },

    clearHistory() {
        const dataset = this.loadDataset();
        dataset.history = [];
        const saved = this.writeDataset(dataset, { preservePrevious: false });
        localStorage.setItem(POOL_DATASET_PREVIOUS_KEY, JSON.stringify(saved));
        localStorage.removeItem(LEGACY_HISTORY_KEY);
    },

    createMatchId,

    importDataset(importedDataset, mode = "merge") {
        const imported = upgradeBackupToCurrent(importedDataset);
        if (mode === "overwrite") {
            this.writeDataset(imported);
            return {
                mode,
                added: imported.history.length,
                duplicates: 0,
                conflicts: 0,
                activeImported: Boolean(imported.active)
            };
        }
        if (mode !== "merge") throw new Error("Import mode must be merge or overwrite.");

        const existing = this.loadDataset();
        const profileMerge = mergePlayerProfiles(existing.profiles, imported.profiles);
        imported.profiles = profileMerge.profiles;
        remapDatasetPlayerIds(imported, profileMerge.idMap);
        const mergeResult = mergeMatchHistories(existing.history, imported.history);
        existing.history = mergeResult.history;
        existing.profiles = profileMerge.profiles;
        const activeImported = !existing.active && Boolean(imported.active);
        if (activeImported) existing.active = imported.active;
        this.writeDataset(existing);
        return Object.assign({
            mode,
            activeImported,
            profilesAdded: profileMerge.added,
            profilesMerged: profileMerge.merged,
            profileConflicts: profileMerge.conflicts
        }, mergeResult);
    }
};

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
        PoolStorage.clearHistory();
        location.reload();
    }
}

// Export Data
function downloadBackup() {
    if (Array.isArray(gameState?.players) && gameState.players.length === 2) {
        PoolStorage.saveActiveMatch(gameState);
    }
    const data = PoolStorage.loadDataset();
    data.exportedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pool_backup.json"; a.click();
}

let selectedImportMode = "merge";

function beginBackupImport(mode) {
    if (mode !== "merge" && mode !== "overwrite") return;
    selectedImportMode = mode;
    document.getElementById("importFile").click();
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
            const sanitizedInput = sanitizeImportedValue(parsed);
            const sanitized = upgradeBackupToCurrent(sanitizedInput);
            if (selectedImportMode === "overwrite" && !confirm(
                "Overwrite the active match and all match history on this device? This cannot be undone unless you exported a backup."
            )) {
                e.target.value = '';
                return;
            }
            const result = PoolStorage.importDataset(sanitized, selectedImportMode);
            const summary = selectedImportMode === "merge"
                ? `${result.added} matches added, ${result.duplicates} duplicates skipped, ${result.conflicts} match conflicts preserved; ${result.profilesAdded} player profiles added and ${result.profilesMerged} matched.`
                : `${result.added} matches and ${sanitized.profiles.length} player profiles restored.`;
            alert(`Backup ${selectedImportMode} completed. ${summary}`);
            location.reload();
        } catch (err) {
            alert(`Backup import failed: ${err.message}`);
            console.error("Backup Import Error:", err);
        } finally {
            e.target.value = '';
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
        validateActiveMatch,
        upgradeBackupToCurrent,
        ensureHistoryMatchIds,
        mergeMatchHistories,
        mergePlayerProfiles,
        normalizePlayerName,
        PoolStorage,
        POOL_DATASET_KEY,
        POOL_DATASET_PREVIOUS_KEY,
        LEGACY_ACTIVE_KEY,
        LEGACY_HISTORY_KEY
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
