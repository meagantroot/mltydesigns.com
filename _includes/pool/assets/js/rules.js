// Games Rules Map
const GAME_RULES = {
    "9-ball": { ballValue: (n) => (n === 9 ? 2 : 1), moneyBall: 9, maxBalls: 9, rackValue: 10 },
    "8-ball": { ballValue: (n) => (n === 8 ? 1 : 0), moneyBall: 8, maxBalls: 15, rackValue: 1 },
    "10-ball": { ballValue: (n) => (n === 8 ? 1 : 0), moneyBall: 10, maxBalls: 10, rackValue: 1 }
};

function calculate9BallLiveScore(committedScore, target, selectedBallIds, options = {}) {
    const selectedPoints = selectedBallIds.reduce(
        (total, ballId) => total + (ballId === 9 ? 2 : 1),
        0
    );

    let pendingPoints = selectedPoints;
    if (options.singleRack) {
        pendingPoints = selectedBallIds.includes(9)
            ? Math.max(target - committedScore, 0)
            : 0;
    } else if (options.suddenDeath) {
        pendingPoints *= 2;
    }

    return {
        committed: committedScore,
        pending: pendingPoints,
        total: committedScore + pendingPoints
    };
}

function calculatePointsNeededToWin(score, target, displayThreshold = 9) {
    const pointsNeeded = Math.max(target - score, 0);
    return pointsNeeded >= 1 && pointsNeeded <= displayThreshold
        ? pointsNeeded
        : null;
}

// Game Win Map
const WIN_CHARTS = {
    "9-ball": { 1: 14, 2: 19, 3: 25, 4: 31, 5: 38, 6: 46, 7: 55, 8: 65, 9: 75 },
    "8-ball": {
        2: { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
        3: { 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 },
        4: { 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 5 },
        5: { 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 5 },
        6: { 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 5 },
        7: { 2: 2, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5 }
    },
    // "10-ball": { 1: 2, 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 }
    "10-ball": {
        2: { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
        3: { 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 },
        4: { 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 5 },
        5: { 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 5 },
        6: { 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 5 },
        7: { 2: 2, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5 }
    },
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculate9BallLiveScore, calculatePointsNeededToWin };
}
