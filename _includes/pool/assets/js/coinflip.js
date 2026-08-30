// Coin Flip Logic

    let p1Choice = null;
    let p2Choice = null;

    function makePick(choice) {
        p1Choice = choice;
        p2Choice = (choice === 'solids') ? 'stripes' : 'solids';

        // Update UI
        document.getElementById('p1-choice-text').innerText = p1Choice.toUpperCase();
        document.getElementById('p2-choice-text').innerText = p2Choice.toUpperCase();
        document.getElementById('p1-area').classList.add('hidden');
        document.getElementById('action-area').classList.remove('hidden');
        document.getElementById('status-text').innerText = "Ready to flip!";
    }

function flipCoin() {
    const coin = document.getElementById('coin-element');
    const flipBtn = document.getElementById('flip-btn');
    const status = document.getElementById('status-text');
    const startBtn = document.getElementById('start-match-btn'); // Grab the new button

    // Animation
    coin.classList.add('flipping');
    flipBtn.classList.add('disabled');
    status.innerText = "Flipping...";

    setTimeout(() => {
        const result = Math.random() < 0.5 ? 'solids' : 'stripes';
        
        // Grab current names from inputs
        const p1Name = clean(document.getElementById('p1Name').value || "Player 1");
        const p2Name = clean(document.getElementById('p2Name').value || "Player 2");

        coin.classList.remove('flipping');
        
        // Your existing SVG rendering logic
        coin.innerHTML = (result === 'solids') ? 
            '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="#800080" stroke="#999" stroke-width="2"/><circle cx="100" cy="100" r="45" fill="white"/><text x="100" y="115" font-size="50" text-anchor="middle" fill="black" font-family="Arial" font-weight="bold">4</text></svg>' : 
            '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><clipPath id="clip"><circle cx="100" cy="100" r="94"/></clipPath></defs><circle cx="100" cy="100" r="94" fill="white" stroke="#999" stroke-width="2"/><rect x="0" y="45" width="200" height="110" fill="#ff0000" clip-path="url(#clip)"/><circle cx="100" cy="100" r="45" fill="white"/><text x="100" y="115" font-size="50" text-anchor="middle" fill="black" font-family="Arial" font-weight="bold">11</text></svg>';
        
        let winMsg = "";
        if (result === p1Choice.toLowerCase()) {
            winMsg = p1Name + " Wins!";
            document.getElementById('p1Starts').checked = true; // Syncs with your radio logic
        } else {
            winMsg = p2Name + " Wins!";
            document.getElementById('p2Starts').checked = true; // Syncs with your radio logic
        }

        status.textContent = clean(winMsg) + "!";
        status.className = "mt-0 fw-bold text-success text-center"; // Make the win message pop

        // Toggle Buttons
        flipBtn.classList.add('hidden');
        document.getElementById('reset-btn').classList.remove('hidden');
        startBtn.classList.remove('hidden'); // Show the START MATCH button
    }, 1200);
}

function resetCoinGame() {
    // Get the name
    const p1Name = document.getElementById('p1Name').value || "Player 1";

    // Clear choices and reset UI elements
    p1Choice = null;
    document.getElementById('coin-element').innerHTML = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="#000000" stroke="#999" stroke-width="2"/><circle cx="100" cy="100" r="45" fill="white"/><text x="100" y="115" font-size="50" text-anchor="middle" fill="black" font-family="Arial" font-weight="bold">?</text></svg>`;
    document.getElementById('p1-area').classList.remove('hidden');
    document.getElementById('action-area').classList.add('hidden');
    document.getElementById('flip-btn').classList.remove('hidden', 'disabled');
    document.getElementById('reset-btn').classList.add('hidden');
    document.getElementById('status-text').className = "mt-0 text-center";
    document.getElementById('start-match-btn').classList.add('hidden');

    // Build the player label as text so a stored name is never interpreted as HTML.
    const status = document.getElementById('status-text');
    const playerName = document.createElement('span');
    playerName.id = 'coin-p1-status';
    playerName.textContent = p1Name;
    status.replaceChildren(playerName, document.createTextNode(' Chooses!'));
}
