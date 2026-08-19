// Player Stats

function updateLifetimeStats() {

    const h = readStoredArray('pool_match_history', { removeInvalid: true });
    const container = document.getElementById('lifetime-stats-content');

    const rawInput = document.getElementById('playerSearch')?.value || "";
    const searchTermStrip = rawInput
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "") // Whitelist: Keep only letters, numbers, and spaces
        .trim();

    // Include DomPurify
const searchTerm = DOMPurify.sanitize(searchTermStrip);

    if (h.length === 0) {
        container.innerHTML = "No match history available.";
        return;
    }

    const statsByPlayer = {};

    h.forEach(m => {
        m.players.forEach(p => {
            const name = p.name || "Unknown Player";
            if (!statsByPlayer[name]) {
                statsByPlayer[name] = { wins: 0, games: 0, scratches: 0, miscues: 0, fouls: 0, escapes: 0, kickshots: 0, safeties: 0, bnr: 0, snap9: 0, break8: 0 };
            }
            statsByPlayer[name].games++;
            if (p.won) statsByPlayer[name].wins++;
            statsByPlayer[name].scratches += parseInt(p.scratches || 0);
            statsByPlayer[name].miscues += parseInt(p.miscues || 0);
            statsByPlayer[name].fouls += parseInt(p.fouls || 0);
            statsByPlayer[name].escapes += parseInt(p.escapes || 0);
            statsByPlayer[name].kickshots += parseInt(p.kickshots || 0);
            statsByPlayer[name].safeties += parseInt(p.safeties || 0);
            statsByPlayer[name].bnr += parseInt(p.breakandrun || 0);
            statsByPlayer[name].break8 += parseInt(p.count8onbreak || 0);
            statsByPlayer[name].snap9 += parseInt(p.count9onsnap || 0);
        });
    });

    const htmlArray = Object.entries(statsByPlayer)
        .filter(([name]) => name.toLowerCase().includes(searchTerm))
        .sort(([nameA], [nameB]) => nameA.localeCompare(nameB)) 
        .map(([name, s], index) => {
            const safeName = escapeHtml(name);
            const winRate = ((s.wins / s.games || 0) * 100).toFixed(1);
            const avgScratches = (s.scratches / s.games|| 0).toFixed(1);
            const avgMiscues = (s.miscues / s.games || 0).toFixed(1);
            const avgFouls = (s.fouls / s.games || 0).toFixed(1);

            const avgEscapes = (s.escapes / s.games|| 0).toFixed(1);
            const avgKickshots = (s.kickshots / s.games || 0).toFixed(1);
            const avgSafeties = (s.safeties / s.games || 0).toFixed(1);

        return `
          <div class="accordion-item" id="player-container-${index}">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" 
                      data-bs-toggle="collapse" 
                      data-bs-target="#player-collapse-${index}" 
                      aria-expanded="false" 
                      aria-controls="player-collapse-${index}">
                ${safeName}
              </button>
            </h2>
            <div id="player-collapse-${index}" class="accordion-collapse collapse" data-bs-parent="#lifetime-stats-content">
              <div class="accordion-body">
                <div class="row">
                    <div class="col-xs-12 col-sm-3 p-1 text-center">
                        <h3 class="h5">Games Played: ${s.games}</h3>
                        <!-- The circular chart -->
                        <div class="win-rate-chart mx-auto" style="--percentage: ${winRate}%;">
                            <div class="chart-inner"><span style="font-size: 0.75rem;margin-bottom: 0.50rem;">Win</span>${winRate}%<span style="font-size: 0.75rem; margin-top: 0.50rem;">Rate</span></div>
                        </div>
                    </div>
                    <div class="col-xs-12 col-sm-9 p-1 text-center"">
                        <div class="row">
                            <div class="col p-1 text-center">
                                <p class="mb-0">Break & Run</p>
                                <div class="rate-circle-static mx-auto border-secondary">
                                    <div class="mb-0" style="font-size: 1.4rem;">${s.bnr}</div>
                                </div>
                            </div>
                            <div class="col p-1 text-center">                         
                                <p class="mb-0">8 on the Break</p>
                                <div class="rate-circle-static mx-auto border-secondary">
                                    <div class="mb-0" style="font-size: 1.4rem;">${s.break8}</div>
                                </div>
                            </div>
                            <div class="col p-1 text-center">                        
                                <p class="mb-0">9 on the Snap</p>
                                <div class="rate-circle-static mx-auto border-secondary">
                                    <div class="mb-0" style="font-size: 1.4rem;">${s.snap9}</div>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col p-1 text-center">
                                <p class="mb-0">Escape Rate</p>
                                <div class="rate-circle-static mx-auto border-secondary">
                                  <div class="mb-0" style="font-size: 1.2rem;">${avgEscapes}</div>
                                    <div class="mt-0" style="font-size: 0.6rem; text-transform: uppercase;">avg per game</div>
                                </div>
                            </div>
                            <div class="col p-1 text-center" style="width: 50%;">
                                <p class="mb-0">Kick Rate</p>
                                <div class="rate-circle-static mx-auto border-secondary">
                                    <div class="mb-0" style="font-size: 1.2rem;">${avgKickshots}</div>
                                    <div class="mt-0" style="font-size: 0.6rem; text-transform: uppercase;">avg per game</div>
                                </div>
                            </div>
                            <div class="col p-1 text-center" style="width: 50%;">
                                <p class="mb-0">Safety Rate</p>
                                <div class="rate-circle-static mx-auto border-secondary">
                                    <div class="mb-0" style="font-size: 1.2rem;">${avgSafeties}</div>
                                    <div class="mt-0" style="font-size: 0.6rem; text-transform: uppercase;">avg per game</div>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col p-1 text-center">
                                <p class="mb-0">Scratch Rate</p>
                                <div class="rate-circle-static mx-auto border-secondary">
                                  <div class="mb-0" style="font-size: 1.2rem;">${avgScratches}</div>
                                    <div class="mt-0" style="font-size: 0.6rem; text-transform: uppercase;">avg per game</div>
                                </div>
                            </div>
                            <div class="col p-1 text-center" style="width: 50%;">
                                <p class="mb-0">Foul Rate</p>
                                <div class="rate-circle-static mx-auto border-secondary">
                                    <div class="mb-0" style="font-size: 1.2rem;">${avgFouls}</div>
                                    <div class="mt-0" style="font-size: 0.6rem; text-transform: uppercase;">avg per game</div>
                                </div>
                            </div>
                            <div class="col p-1 text-center" style="width: 50%;">
                                <p class="mb-0">Miscue Rate</p>
                                <div class="rate-circle-static mx-auto border-secondary">
                                    <div class="mb-0" style="font-size: 1.2rem;">${avgMiscues}</div>
                                    <div class="mt-0" style="font-size: 0.6rem; text-transform: uppercase;">avg per game</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </div>`;
    });
    container.innerHTML = htmlArray.length > 0 ? htmlArray.join('') : "No players found matching that name.";
}
