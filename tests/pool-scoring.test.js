const test = require("node:test");
const assert = require("node:assert/strict");

const {
    calculate9BallLiveScore,
    calculatePointsNeededToWin,
    is9BallBreakAndRun
} = require(
    "../_includes/pool/assets/js/rules.js"
);

test("shows one live point for each selected object ball", () => {
    assert.deepEqual(calculate9BallLiveScore(12, 31, [1, 4, 8]), {
        committed: 12,
        pending: 3,
        total: 15
    });
});

test("shows two live points for the 9-ball", () => {
    assert.deepEqual(calculate9BallLiveScore(12, 31, [3, 9]), {
        committed: 12,
        pending: 3,
        total: 15
    });
});

test("removing a selected ball removes its pending points", () => {
    const before = calculate9BallLiveScore(12, 31, [2, 5, 9]);
    const after = calculate9BallLiveScore(12, 31, [2, 9]);

    assert.equal(before.total, 16);
    assert.equal(after.total, 15);
});

test("doubles pending points in sudden-death mode", () => {
    assert.deepEqual(
        calculate9BallLiveScore(12, 31, [2, 9], { suddenDeath: true }),
        { committed: 12, pending: 6, total: 18 }
    );
});

test("single-rack mode only projects a win when the 9-ball is selected", () => {
    assert.equal(
        calculate9BallLiveScore(0, 1, [1, 2], { singleRack: true }).total,
        0
    );
    assert.equal(
        calculate9BallLiveScore(0, 1, [1, 9], { singleRack: true }).total,
        1
    );
});

test("shows the countdown only when nine or fewer points remain", () => {
    assert.equal(calculatePointsNeededToWin(21, 31), null);
    assert.equal(calculatePointsNeededToWin(22, 31), 9);
    assert.equal(calculatePointsNeededToWin(30, 31), 1);
    assert.equal(calculatePointsNeededToWin(31, 31), null);
});

test("updates points needed using the live score", () => {
    const before = calculate9BallLiveScore(21, 31, []);
    const afterOneBall = calculate9BallLiveScore(21, 31, [4]);
    const afterNineBall = calculate9BallLiveScore(21, 31, [4, 9]);

    assert.equal(calculatePointsNeededToWin(before.total, 31), null);
    assert.equal(calculatePointsNeededToWin(afterOneBall.total, 31), 9);
    assert.equal(calculatePointsNeededToWin(afterNineBall.total, 31), 7);
});

test("awards a 9-ball Break and Run only to the player who broke", () => {
    const fullRack = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    assert.equal(is9BallBreakAndRun(fullRack, true), true);
    assert.equal(is9BallBreakAndRun(fullRack, false), false);
    assert.equal(is9BallBreakAndRun(fullRack.slice(0, 8), true), false);
});
