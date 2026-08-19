// Game History

function displayHistory() {
    const h = readStoredArray('pool_match_history', { removeInvalid: true });
    const container = document.getElementById('history-list');
    
    // Get the search term from the input field
    // const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || "";

// Clean the input as soon as you grab it
const rawInput = document.getElementById('historySearch')?.value || "";
const searchTermStrip = rawInput
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "") // Whitelist: Keep only letters, numbers, and spaces
    .trim();

const searchTerm = DOMPurify.sanitize(searchTermStrip);

    // Filter the history array based on names or mode
    const filteredHistory = h.filter(m => {
        const player1 = m.players[0].name.toLowerCase();
        const player2 = m.players[1].name.toLowerCase();
        const mode = m.mode.toLowerCase();
        const id = m.matchId;

            // console.log(m);
        
        return player1.includes(searchTerm) || 
               player2.includes(searchTerm) || 
               mode.includes(searchTerm);
    });

    // Map the filtered array to HTML

const htmlOutput = filteredHistory.map((m, index) => {

    const player1Name = escapeHtml(m.players[0].name);
    const player2Name = escapeHtml(m.players[1].name);
    const matchDate = escapeHtml(m.date);
    const matchTime = escapeHtml(m.time);
    const matchId = escapeHtml(m.matchId);

    // Check if we even have data
    const hasInnings = m.inningdata && Object.keys(m.inningdata).length > 0;

    // Map the rows (If hasInnings is true)
let lastRack = null;

const rows = hasInnings ? Object.values(m.inningdata)
    .filter(inn => typeof inn === 'object' && inn !== null)
    .map((inn, idx) => {
        const p1Id = m.players[0].id !== undefined ? String(m.players[0].id) : "0";
        const p2Id = m.players[1].id !== undefined ? String(m.players[1].id) : "1";

        const p1Data = inn[p1Id] || { balls: [], points: 0 };
        const p2Data = inn[p2Id] || { balls: [], points: 0 };

let rackRow = '';
const currentRack = inn[p1Id]?.rack ?? inn[p2Id]?.rack;

if (currentRack != null && currentRack !== lastRack) {
    lastRack = currentRack;

    rackRow = `
    <tr class="table-info m-0 p-0">
        <td colspan="3" class="text-center" style="padding:1px; margin:0; line-height: 1.1em; font-size: 12px;">
            <strong>Rack ${currentRack}</strong>
        </td>
    </tr>`;
}
// console.log(inn);

function getBallSVG(ball) {
    const colors = {
        1: '#FFD700', 9: '#FFD700',
        2: '#0055A4', 10: '#0055A4',
        3: '#EF4135', 11: '#EF4135',
        4: '#2E3192', 12: '#2E3192',
        5: '#FF8C00', 13: '#FF8C00',
        6: '#007A33', 14: '#007A33',
        7: '#800020', 15: '#800020',
        8: '#000000'
    };

    const color = colors[ball] || '#CCC';
    const isStriped = ball > 8;

    return `
        <svg width="20" height="20" viewBox="0 0 100 100" 
             style="display:inline-block; vertical-align:middle;">
            ${isStriped ? `
            <defs>
                <clipPath id="clip-${ball}">
                    <circle cx="50" cy="50" r="47"/>
                </clipPath>
            </defs>
            <circle cx="50" cy="50" r="47" fill="white" stroke="#000" stroke-width="2"/>
            <rect x="0" y="22" width="100" height="56" fill="${color}" clip-path="url(#clip-${ball})"/>
            <circle cx="50" cy="50" r="23" fill="white"/>
            ` : `
            <circle cx="50" cy="50" r="47" fill="${color}" stroke="#000" stroke-width="2"/>
            <circle cx="50" cy="50" r="23" fill="white"/>
            `}
            <text x="50" y="58" font-size="34" text-anchor="middle" fill="black" 
                  font-family="Arial" font-weight="bold">${ball}</text>
        </svg>`;
}

return `
    ${rackRow}
    <tr>
        <td class="text-start">
            <div style="display:flex; flex-wrap:wrap; gap:2px; justify-content:flex-start;">
                ${(p1Data.balls || []).map(num => getBallSVG(num)).join('') || '-'}
            </div>
        </td>

        <td class="text-center"><strong>${idx}</strong></td>

        <td class="text-end">
            <div style="display:flex; flex-wrap:wrap; gap:2px; justify-content:flex-end;">
                ${(p2Data.balls || []).map(num => getBallSVG(num)).join('') || '-'}
            </div>
        </td>
    </tr>`;
    }).join('') : '';

        const getRate = (player, statKey, totalInnings) => {
            const statValue = player?.[statKey];
            return (totalInnings > 0 && statValue !== undefined)
                ? statValue.toFixed(0)
                : "0";
                
        };

        const p0scratchRate = getRate(m.players[0], 'scratches', m.innings);
        const p1scratchRate = getRate(m.players[1], 'scratches', m.innings);

        const p0foulRate = getRate(m.players[0], 'fouls', m.innings);
        const p1foulRate = getRate(m.players[1], 'fouls', m.innings);

        const p0miscueRate = getRate(m.players[0], 'miscues', m.innings);
        const p1miscueRate = getRate(m.players[1], 'miscues', m.innings);

        const p0escapeRate = getRate(m.players[0], 'escapes', m.innings);
        const p1escapeRate = getRate(m.players[1], 'escapes', m.innings);

        const p0kickRate = getRate(m.players[0], 'kickshots', m.innings);
        const p1kickRate = getRate(m.players[1], 'kickshots', m.innings);

        const p0safetyRate = getRate(m.players[0], 'safeties', m.innings);
        const p1safetyRate = getRate(m.players[1], 'safeties', m.innings);

    // Create the table container OR the empty message
    const tableSection = (hasInnings && rows !== '') ? `
        <div class="row">
            <div class="col w-100">
                <table class="table table-sm fixed-table">
                    <tr class="table-primary">
                        <th class="text-start" style="width: 40%;"></th>
                        <th class="text-center" style="width: 10%;">inn</th>
                        <th class="text-end" style="width: 40%;"></th>
                    </tr>
                    ${rows}
                </table>
            </div>
        </div>` : `<p class="text-center text-muted my-3">No inning data available for this match.</p>`;

    // Return the accordion template
return `
<div class="accordion-item" id="player-container-${index}">
  <h2 class="accordion-header">
    <button class="accordion-button collapsed" type="button"
            data-bs-toggle="collapse"
            data-bs-target="#player-collapse-${index}"
            aria-expanded="false"
            aria-controls="player-collapse-${index}">
      <div class="me-3">
        ${m.mode === '8-ball' ? `<div class="ball" data-id="8">8</div>` : ''}
        ${m.mode === '9-ball' ? `<div class="ball" data-id="9">9</div>` : ''}
        ${m.mode === '10-ball' ? `<div class="ball" data-id="10">10</div>` : ''} 
      </div>
      <div class="text-start">
        <p class="m-0"><strong>${player1Name} vs. ${player2Name}</strong></p>
        <p class="m-0 text"><small>${matchDate} - ${matchTime}</small></p>
        ${m.racks ? `<p class="m-0 text-muted"><small>Racks: ${m.racks} - Innings: ${m.innings}</small></p>` : ''}
      </div>
    </button>
  </h2>

  <div id="player-collapse-${index}" class="accordion-collapse collapse" data-bs-parent="#history-list">
    <div class="accordion-body p-2">
      <div class="d-flex w-100 justify-content-between">
        <div class="col">
          <p class="text-start m-0"><span class="h4">${player1Name}</span><br><strong>${m.players[0].score}/${m.players[0].target}</strong></p>
          <p class="text-start m-0">${m.players[0].won ? '<span class="badge bg-success">win</span>' : '<span class="badge bg-danger">loss</span>'}</p>
          <p class="text-start mt-1">
            ${m.players[0].skill != null ? 'SL: '+ m.players[0].skill : ''}<br>
            
            ${p0scratchRate > 0 ? `Scratch: ${p0scratchRate}<br>` : ''}
            ${p0foulRate > 0 ? `Foul: ${p0foulRate}<br>` : ''}
            ${p0miscueRate > 0 ? `Miscue: ${p0miscueRate}<br>` : ''}
            ${p0escapeRate > 0 ? `Escape: ${p0escapeRate}<br>` : ''}
            ${p0kickRate > 0 ? `Kick: ${p0kickRate}<br>` : ''}
            ${p0safetyRate > 0 ? `Safety: ${p0safetyRate}<br>` : ''}
            
            ${m.players[0].breakandrun > 0 ? `Break and Run: ${m.players[0].breakandrun}<br>` : ''}
            ${m.mode === '8-ball' && m.players[0].count8onbreak > 0 ? `8 on the Break: ${m.players[0].count8onbreak}` : ''}
            ${m.mode === '9-ball' && m.players[0].count9onsnap > 0 ? `9 on the Snap: ${m.players[0].count9onsnap}` : ''}
          </p>
        </div>
        <div class="col">
          <p class="text-end m-0"><span class="h4">${player2Name}</span><br><strong>${m.players[1].score}/${m.players[1].target}</strong></p>
          <p class="text-end m-0">${m.players[1].won ? '<span class="badge bg-success">win</span>' : '<span class="badge bg-danger">loss</span>'}</p>
          <p class="text-end mt-1">
            ${m.players[1].skill != null ? 'SL: '+ m.players[1].skill : ''}<br>

            ${p1scratchRate > 0 ? `Scratch: ${p1scratchRate}<br>` : ''}
            ${p1foulRate > 0 ? `Foul: ${p1foulRate}<br>` : ''}
            ${p1miscueRate > 0 ? `Miscue: ${p1miscueRate}<br>` : ''}
            ${p1escapeRate > 0 ? `Escape: ${p1escapeRate}<br>` : ''}
            ${p1kickRate > 0 ? `Kick: ${p1kickRate}<br>` : ''}
            ${p1safetyRate > 0 ? `Safety: ${p1safetyRate}<br>` : ''}

            ${m.players[1].breakandrun > 0 ? `Break and Run: ${m.players[1].breakandrun}<br>` : ''}
            ${m.mode === '8-ball' && m.players[1].count8onbreak > 0 ? `8 on the Break: ${m.players[1].count8onbreak}` : ''}
            ${m.mode === '9-ball' && m.players[1].count9onsnap > 0 ? `9 on the Snap: ${m.players[1].count9onsnap}` : ''}
          </p>
        </div>
      </div>

      ${tableSection}

      <div class="text-right m-0 p-0 text-xsmall">
        ${m.matchId ? `<small>Match id: ${matchId}</small>` : ''}
      </div>
    </div>
  </div>
</div>`;
}).join('');

    // Render output or a "Not Found" message
    container.innerHTML = htmlOutput || `<div class="p-3 text-center text-muted">No players found matching that name.</div>`;
}
