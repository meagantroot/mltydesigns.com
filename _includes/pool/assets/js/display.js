let orientationOffcanvasElement = null;
let orientationOffcanvas = null;
let landscapeQuery = null;

function updateLandscapeScoreboard(liveScores = null) {
    const hasActiveMatch = Boolean(gameState && Array.isArray(gameState.players) && gameState.players.length === 2);
    const shouldShow = landscapeQuery?.matches && window.innerWidth < 992;
    const scoreboard = document.getElementById('landscape-match-scoreboard');
    const rotateMessage = document.getElementById('landscape-rotate-message');

    scoreboard?.classList.toggle('hidden', !hasActiveMatch);
    rotateMessage?.classList.toggle('hidden', hasActiveMatch);

    if (hasActiveMatch) {
        const scores = Array.isArray(liveScores)
            ? liveScores
            : gameState.players.map(player => player.score);

        document.getElementById('landscape-player-1-name').textContent = gameState.players[0].name;
        document.getElementById('landscape-player-1-score').textContent = scores[0];
        document.getElementById('landscape-player-2-name').textContent = gameState.players[1].name;
        document.getElementById('landscape-player-2-score').textContent = scores[1];
        document.getElementById('landscape-inning').textContent = gameState.currentInningIndex;
    }

    if (!orientationOffcanvas || !orientationOffcanvasElement) return;

    const isVisible = orientationOffcanvasElement.classList.contains('show') ||
        orientationOffcanvasElement.classList.contains('showing');

    if (shouldShow && !isVisible) {
        orientationOffcanvas.show();
    } else if (!shouldShow && isVisible) {
        orientationOffcanvas.hide();
    }
}

document.addEventListener("DOMContentLoaded", function() {
    orientationOffcanvasElement = document.getElementById('orientationOffcanvas');
    orientationOffcanvas = new bootstrap.Offcanvas(orientationOffcanvasElement);
    landscapeQuery = window.matchMedia("(orientation: landscape)");

    landscapeQuery.addEventListener("change", () => updateLandscapeScoreboard());
    window.addEventListener("resize", () => updateLandscapeScoreboard());
    updateLandscapeScoreboard();
});
