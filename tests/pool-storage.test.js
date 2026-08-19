const test = require("node:test");
const assert = require("node:assert/strict");

const {
    BACKUP_SCHEMA_VERSION,
    readStoredJson,
    readStoredArray,
    sanitizeImportedValue,
    validateImportedBackup
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

    validateImportedBackup(legacy);

    assert.equal(legacy.schemaVersion, BACKUP_SCHEMA_VERSION);
    assert.equal(legacy.active, null);
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
        () => validateImportedBackup(backup({ schemaVersion: 2 })),
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
