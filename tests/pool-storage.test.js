const test = require("node:test");
const assert = require("node:assert/strict");

const {
    BACKUP_SCHEMA_VERSION,
    readStoredJson,
    readStoredArray,
    sanitizeImportedValue,
    validateImportedBackup,
    upgradeBackupToCurrent,
    mergeMatchHistories,
    PoolStorage,
    POOL_DATASET_KEY,
    POOL_DATASET_PREVIOUS_KEY,
    LEGACY_ACTIVE_KEY,
    LEGACY_HISTORY_KEY
} = require("../_includes/pool/assets/js/storage.js");

class StorageMock {
    constructor(entries = {}) {
        this.values = new Map(Object.entries(entries));
    }

    getItem(key) {
        return this.values.has(key) ? this.values.get(key) : null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }

    removeItem(key) {
        this.values.delete(key);
    }

    key(index) {
        return Array.from(this.values.keys())[index] ?? null;
    }

    get length() {
        return this.values.size;
    }
}

function player(name, skill = 3) {
    return { name, skill, score: 0, target: 10, won: false };
}

function backup(overrides = {}) {
    return {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        active: null,
        history: [{ mode: "8-ball", players: [player("Ada"), player("Grace")] }],
        ...overrides
    };
}

test.afterEach(() => {
    delete global.localStorage;
    delete global.DOMPurify;
    delete global.document;
});

test.beforeEach(() => {
    global.DOMPurify = {
        sanitize: value => value.replace(/<[^>]*>/g, "")
    };
    global.document = {
        createElement: () => ({
            set innerHTML(value) { this.value = value; },
            value: ""
        })
    };
});

test("reads valid JSON from local storage", () => {
    global.localStorage = new StorageMock({ settings: '{"sound":true}' });
    assert.deepEqual(readStoredJson("settings", null), { sound: true });
});

test("recovers from malformed local storage data", () => {
    global.localStorage = new StorageMock({ history: "not json" });
    let reported = false;

    assert.deepEqual(readStoredJson("history", [], {
        removeInvalid: true,
        onError: () => { reported = true; }
    }), []);
    assert.equal(global.localStorage.getItem("history"), null);
    assert.equal(reported, true);
});

test("rejects a stored history value that is not an array", () => {
    global.localStorage = new StorageMock({ history: '{"unexpected":true}' });
    assert.deepEqual(readStoredArray("history", { removeInvalid: true }), []);
    assert.equal(global.localStorage.getItem("history"), null);
});

test("accepts an unversioned legacy backup with an idle active state", () => {
    const legacy = backup({ active: { currentInningIndex: 0, rackShotCount: 0 } });
    delete legacy.schemaVersion;

    const upgraded = upgradeBackupToCurrent(legacy);

    assert.equal(upgraded.schemaVersion, BACKUP_SCHEMA_VERSION);
    assert.equal(upgraded.active, null);
    assert.match(upgraded.history[0].matchId, /^legacy-/);
});

test("accepts a resumable 9-ball match with skill level 1", () => {
    const data = backup({
        active: {
            mode: "9-ball",
            players: [player("Ada", 1), player("Grace", 9)],
            currentTurn: 0,
            currentInningIndex: 0,
            currentRack: 1,
            innings: []
        }
    });
    assert.doesNotThrow(() => validateImportedBackup(data));
});

test("rejects an unsupported future schema version", () => {
    assert.throws(
        () => upgradeBackupToCurrent(backup({ schemaVersion: 99 })),
        /Unsupported backup schema version/
    );
});

test("rejects unsupported modes and invalid player skill levels", () => {
    assert.throws(
        () => validateImportedBackup(backup({
            history: [{ mode: "rotation", players: [player("Ada"), player("Grace")] }]
        })),
        /unsupported game mode/
    );
    assert.throws(
        () => validateImportedBackup(backup({
            history: [{ mode: "8-ball", players: [player("Ada", 1), player("Grace")] }]
        })),
        /skill must be an integer between 2 and 7/
    );
});

test("rejects invalid ball data", () => {
    const data = backup({
        history: [{
            mode: "8-ball",
            players: [player("Ada"), player("Grace")],
            inningdata: [{ 0: { balls: [1, 16] }, 1: { balls: [] } }]
        }]
    });
    assert.throws(() => validateImportedBackup(data), /ball number between 1 and 15/);
});

test("accepts a valid inning that spans multiple racks", () => {
    const data = backup({
        history: [{
            mode: "9-ball",
            players: [player("Ada"), player("Grace")],
            inningdata: [{
                0: { balls: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7] },
                1: { balls: [] }
            }]
        }]
    });

    assert.doesNotThrow(() => validateImportedBackup(data));
});

test("rejects an excessively large multi-rack inning", () => {
    const data = backup({
        history: [{
            mode: "9-ball",
            players: [player("Ada"), player("Grace")],
            inningdata: [{ 0: { balls: Array(151).fill(1) }, 1: { balls: [] } }]
        }]
    });

    assert.throws(() => validateImportedBackup(data), /no more than 150 balls/);
});

test("rejects prototype-pollution keys", () => {
    const unsafe = JSON.parse('{"history":[],"__proto__":{"admin":true}}');
    assert.throws(() => sanitizeImportedValue(unsafe), /unsafe property/);
});

test("sanitizes imported strings before storage", () => {
    global.DOMPurify = {
        sanitize: value => value.replace(/<[^>]*>/g, "")
    };
    global.document = {
        createElement: () => ({
            set innerHTML(value) { this.value = value; },
            value: ""
        })
    };

    const cleaned = sanitizeImportedValue({ name: '<img src=x onerror=alert(1)>Ada' });
    assert.equal(cleaned.name, "Ada");
});

test("sanitizes and persists an existing unified localStorage dataset when loading", () => {
    const stored = backup({
        history: [{
            matchId: "stored-match",
            mode: "8-ball",
            players: [player('<img src=x onerror=alert(1)>Ada'), player("Grace")]
        }]
    });
    global.localStorage = new StorageMock({
        [POOL_DATASET_KEY]: JSON.stringify(stored)
    });

    const dataset = PoolStorage.loadDataset();
    const persisted = JSON.parse(global.localStorage.getItem(POOL_DATASET_KEY));

    assert.equal(dataset.history[0].players[0].name, "Ada");
    assert.equal(persisted.history[0].players[0].name, "Ada");
});

test("sanitizes player names while migrating legacy localStorage history", () => {
    global.localStorage = new StorageMock({
        [LEGACY_HISTORY_KEY]: JSON.stringify([{
            mode: "8-ball",
            players: [player('<svg onload=alert(1)>Ada'), player("Grace")]
        }])
    });

    const dataset = PoolStorage.loadDataset();

    assert.equal(dataset.history[0].players[0].name, "Ada");
    assert.equal(JSON.parse(global.localStorage.getItem(POOL_DATASET_KEY)).history[0].players[0].name, "Ada");
});

test("upgrades legacy localStorage keys into one schema-v2 dataset", () => {
    const history = [{ mode: "8-ball", players: [player("Ada"), player("Grace")] }];
    global.localStorage = new StorageMock({
        [LEGACY_ACTIVE_KEY]: "null",
        [LEGACY_HISTORY_KEY]: JSON.stringify(history)
    });

    const dataset = PoolStorage.loadDataset();

    assert.equal(dataset.schemaVersion, BACKUP_SCHEMA_VERSION);
    assert.equal(dataset.history.length, 1);
    assert.match(dataset.history[0].matchId, /^legacy-/);
    assert.notEqual(global.localStorage.getItem(POOL_DATASET_KEY), null);
    assert.equal(global.localStorage.getItem(LEGACY_HISTORY_KEY), JSON.stringify(history));
});

test("loads an existing unified dataset without changing stable match IDs", () => {
    global.localStorage = new StorageMock();
    PoolStorage.writeDataset(backup({
        history: [{
            matchId: "stable-match",
            mode: "8-ball",
            players: [player("Ada"), player("Grace")]
        }]
    }));

    assert.equal(PoolStorage.loadHistory()[0].matchId, "stable-match");
});

test("merge adds new matches and skips exact duplicates", () => {
    const existing = [{
        matchId: "one",
        mode: "8-ball",
        players: [player("Ada"), player("Grace")]
    }];
    const imported = [existing[0], {
        matchId: "two",
        mode: "9-ball",
        players: [player("Lin", 4), player("Jo", 5)]
    }];

    const result = mergeMatchHistories(existing, imported);

    assert.equal(result.added, 1);
    assert.equal(result.duplicates, 1);
    assert.equal(result.conflicts, 0);
    assert.deepEqual(result.history.map(match => match.matchId), ["one", "two"]);
});

test("merge skips identical match content even when IDs differ", () => {
    const match = {
        matchId: "original-id",
        date: "8/30/2026",
        mode: "8-ball",
        players: [player("Ada"), player("Grace")]
    };
    const importedCopy = Object.assign({}, match, { matchId: "different-id" });

    const result = mergeMatchHistories([match], [importedCopy]);

    assert.equal(result.added, 0);
    assert.equal(result.duplicates, 1);
    assert.equal(result.history.length, 1);
});

test("merge skips the same stable match after a historical player is mapped and renamed", () => {
    const mappedMatch = {
        matchId: "legacy-jessica-match",
        date: "8/30/2026",
        mode: "8-ball",
        players: [
            Object.assign(player("Jessica Parr", 3), { playerId: "jessica-profile" }),
            player("Grace", 4)
        ]
    };
    const oldBackupMatch = {
        matchId: "legacy-jessica-match",
        date: "8/30/2026",
        mode: "8-ball",
        players: [player("Jessica", 3), player("Grace", 4)]
    };

    const result = mergeMatchHistories([mappedMatch], [oldBackupMatch]);

    assert.equal(result.added, 0);
    assert.equal(result.duplicates, 1);
    assert.equal(result.conflicts, 0);
    assert.equal(result.history.length, 1);
    assert.equal(result.history[0].players[0].name, "Jessica Parr");
    assert.equal(result.history[0].players[0].playerId, "jessica-profile");
});

test("merge preserves ID conflicts once and remains idempotent", () => {
    const existing = [{
        matchId: "same-id",
        mode: "8-ball",
        players: [player("Ada"), player("Grace")]
    }];
    const conflicting = [{
        matchId: "same-id",
        mode: "9-ball",
        players: [player("Lin", 4), player("Jo", 5)]
    }];

    const first = mergeMatchHistories(existing, conflicting);
    const second = mergeMatchHistories(first.history, conflicting);

    assert.equal(first.conflicts, 1);
    assert.equal(first.history.length, 2);
    assert.equal(second.duplicates, 1);
    assert.equal(second.history.length, 2);
});

test("merge keeps an existing active match while overwrite replaces it", () => {
    global.localStorage = new StorageMock();
    const existingActive = {
        mode: "9-ball",
        players: [player("Existing", 3), player("Player", 4)]
    };
    const importedActive = {
        mode: "9-ball",
        players: [player("Imported", 3), player("Player", 4)]
    };
    PoolStorage.writeDataset(backup({ active: existingActive, history: [] }));

    PoolStorage.importDataset(backup({ active: importedActive, history: [] }), "merge");
    assert.equal(PoolStorage.loadActiveMatch().players[0].name, "Existing");

    PoolStorage.importDataset(backup({ active: importedActive, history: [] }), "overwrite");
    assert.equal(PoolStorage.loadActiveMatch().players[0].name, "Imported");
});

test("recovers the previous verified dataset when the current copy is corrupt", () => {
    global.localStorage = new StorageMock();
    PoolStorage.writeDataset(backup({ history: [] }));
    PoolStorage.writeDataset(backup({
        history: [{
            matchId: "newer",
            mode: "8-ball",
            players: [player("Ada"), player("Grace")]
        }]
    }));
    assert.notEqual(global.localStorage.getItem(POOL_DATASET_PREVIOUS_KEY), null);
    global.localStorage.setItem(POOL_DATASET_KEY, "corrupt json");

    const recovered = PoolStorage.loadDataset();

    assert.deepEqual(recovered.history, []);
    assert.doesNotThrow(() => JSON.parse(global.localStorage.getItem(POOL_DATASET_KEY)));
});

test("a failed write leaves the current verified dataset intact", () => {
    class FailingStorage extends StorageMock {
        setItem(key, value) {
            if (this.failWrites && key === "pool_dataset_pending") {
                throw new Error("Quota exceeded");
            }
            super.setItem(key, value);
        }
    }

    global.localStorage = new FailingStorage();
    PoolStorage.writeDataset(backup({ history: [] }));
    const before = global.localStorage.getItem(POOL_DATASET_KEY);
    global.localStorage.failWrites = true;

    assert.throws(
        () => PoolStorage.saveHistory([{
            matchId: "new",
            mode: "8-ball",
            players: [player("Ada"), player("Grace")]
        }]),
        /Quota exceeded/
    );
    assert.equal(global.localStorage.getItem(POOL_DATASET_KEY), before);
});

test("clearing history also clears stale legacy and recovery history", () => {
    const oldHistory = [{
        matchId: "old",
        mode: "8-ball",
        players: [player("Ada"), player("Grace")]
    }];
    global.localStorage = new StorageMock({
        [LEGACY_HISTORY_KEY]: JSON.stringify(oldHistory)
    });
    PoolStorage.loadDataset();

    PoolStorage.clearHistory();
    global.localStorage.setItem(POOL_DATASET_KEY, "corrupt");

    assert.deepEqual(PoolStorage.loadHistory(), []);
    assert.equal(global.localStorage.getItem(LEGACY_HISTORY_KEY), null);
});

test("recovers a verified pending dataset when the primary key is missing", () => {
    global.localStorage = new StorageMock();
    const pending = upgradeBackupToCurrent(backup({
        history: [{
            matchId: "pending-match",
            mode: "8-ball",
            players: [player("Ada"), player("Grace")]
        }]
    }));
    global.localStorage.setItem("pool_dataset_pending", JSON.stringify(pending));

    const recovered = PoolStorage.loadDataset();

    assert.equal(recovered.history[0].matchId, "pending-match");
    assert.notEqual(global.localStorage.getItem(POOL_DATASET_KEY), null);
    assert.equal(global.localStorage.getItem("pool_dataset_pending"), null);
});

test("legacy migration keeps valid matches when another legacy item is invalid", () => {
    const validMatch = {
        mode: "8-ball",
        players: [player("Ada"), player("Grace")]
    };
    global.localStorage = new StorageMock({
        [LEGACY_HISTORY_KEY]: JSON.stringify([validMatch, { mode: "invalid" }])
    });

    const migrated = PoolStorage.loadDataset();

    assert.equal(migrated.history.length, 1);
    assert.equal(migrated.history[0].players[0].name, "Ada");
    assert.notEqual(global.localStorage.getItem(LEGACY_HISTORY_KEY), null);
});

test("stores separate skill levels for one player profile", () => {
    global.localStorage = new StorageMock();
    const created = PoolStorage.upsertProfile({
        name: "Ada",
        skillLevels: { "8-ball": 4 }
    });
    PoolStorage.upsertProfile({
        playerId: created.playerId,
        name: "Ada",
        skillLevels: { "9-ball": 6 }
    });

    const profiles = PoolStorage.loadProfiles();
    assert.equal(profiles.length, 1);
    assert.deepEqual(profiles[0].skillLevels, { "8-ball": 4, "9-ball": 6, "10-ball": 4 });
});

test("stores default skill levels for every mode when an upsert omits unchanged values", () => {
    global.localStorage = new StorageMock();

    PoolStorage.upsertProfile({ name: "Ada" });

    assert.deepEqual(PoolStorage.loadProfiles()[0].skillLevels, {
        "8-ball": 4,
        "9-ball": 5,
        "10-ball": 4
    });
});

test("creates profiles from exact historical names and attributes matches", () => {
    global.localStorage = new StorageMock();
    PoolStorage.writeDataset(backup({
        history: [
            { mode: "8-ball", players: [player("Ada", 4), player("Grace", 5)] },
            { mode: "9-ball", players: [player("Ada", 6), player("Lin", 3)] }
        ]
    }));

    const result = PoolStorage.createProfilesFromHistory();
    const dataset = PoolStorage.loadDataset();
    const ada = dataset.profiles.find(profile => profile.name === "Ada");

    assert.equal(result.created, 3);
    assert.equal(result.mapped, 4);
    assert.deepEqual(ada.skillLevels, { "8-ball": 4, "9-ball": 6 });
    assert.equal(dataset.history[0].players[0].playerId, ada.playerId);
    assert.equal(dataset.history[1].players[0].playerId, ada.playerId);
});

test("manually maps and renames a historical name variant to a stored profile", () => {
    global.localStorage = new StorageMock();
    const profile = PoolStorage.upsertProfile({
        name: "Meagan",
        skillLevels: { "8-ball": 4 }
    });
    PoolStorage.saveHistory([{
        mode: "8-ball",
        players: [player("Meg", 4), player("Grace", 5)]
    }]);

    const mapped = PoolStorage.mapHistoryNameToProfile("Meg", profile.playerId);

    assert.equal(mapped, 1);
    assert.equal(PoolStorage.loadHistory()[0].players[0].playerId, profile.playerId);
    assert.equal(PoolStorage.loadHistory()[0].players[0].name, "Meagan");
});

test("exact-name mapping applies the profile's canonical capitalization", () => {
    global.localStorage = new StorageMock();
    const profile = PoolStorage.upsertProfile({
        name: "Meagan",
        skillLevels: { "8-ball": 4 }
    });
    PoolStorage.saveHistory([{
        mode: "8-ball",
        players: [player("MEAGAN", 4), player("Grace", 5)]
    }]);

    const mapped = PoolStorage.mapExactProfileNames();
    const mappedPlayer = PoolStorage.loadHistory()[0].players[0];

    assert.equal(mapped, 1);
    assert.equal(mappedPlayer.playerId, profile.playerId);
    assert.equal(mappedPlayer.name, "Meagan");
});

test("merge keeps same-name profiles separate when their stable IDs differ", () => {
    global.localStorage = new StorageMock();
    PoolStorage.writeDataset(backup({
        profiles: [{
            playerId: "local-ada",
            name: "Ada",
            skillLevels: { "8-ball": 4 }
        }],
        history: []
    }));
    const imported = backup({
        profiles: [{
            playerId: "imported-ada",
            name: "Ada",
            skillLevels: { "9-ball": 6 }
        }],
        history: [{
            matchId: "imported-match",
            mode: "9-ball",
            players: [
                Object.assign(player("Ada", 6), { playerId: "imported-ada" }),
                player("Grace", 5)
            ]
        }]
    });

    const result = PoolStorage.importDataset(imported, "merge");
    const dataset = PoolStorage.loadDataset();

    assert.equal(result.profilesMerged, 0);
    assert.equal(result.profilesAdded, 1);
    assert.equal(dataset.profiles.length, 2);
    assert.equal(dataset.history[0].players[0].playerId, "imported-ada");
});

test("merge combines non-conflicting skills for the same stable profile ID", () => {
    global.localStorage = new StorageMock();
    PoolStorage.writeDataset(backup({
        profiles: [{ playerId: "ada-id", name: "Ada", skillLevels: { "8-ball": 4 } }],
        history: []
    }));

    const result = PoolStorage.importDataset(backup({
        profiles: [{ playerId: "ada-id", name: "Ada", skillLevels: { "9-ball": 6 } }],
        history: []
    }), "merge");

    assert.equal(result.profilesMerged, 1);
    assert.deepEqual(PoolStorage.loadProfiles()[0].skillLevels, { "8-ball": 4, "9-ball": 6 });
});

test("deleting one match preserves other matches and player profiles", () => {
    global.localStorage = new StorageMock();
    const profile = PoolStorage.upsertProfile({
        name: "Ada",
        skillLevels: { "8-ball": 4 }
    });
    const history = PoolStorage.saveHistory([
        { matchId: "delete-me", mode: "8-ball", players: [player("Ada", 4), player("Grace", 5)] },
        { matchId: "keep-me", mode: "9-ball", players: [player("Ada", 6), player("Lin", 3)] }
    ]);

    assert.equal(history.length, 2);
    assert.equal(PoolStorage.deleteMatch("delete-me"), true);
    assert.deepEqual(PoolStorage.loadHistory().map(match => match.matchId), ["keep-me"]);
    assert.equal(PoolStorage.loadProfiles().length, 1);
    assert.equal(PoolStorage.loadProfiles()[0].playerId, profile.playerId);
    assert.equal(PoolStorage.deleteMatch("missing-match"), false);
});
