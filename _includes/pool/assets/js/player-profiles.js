function getSetupGameMode() {
    return document.querySelector('input[name="gameMode"]:checked')?.value || '8-ball';
}

let profileEditorTargetSlot = null;

function getAddNewPlayerValue() {
    return '__add_new_player__';
}

function setSetupSkill(slot, skill) {
    const slider = document.getElementById(`p${slot}Skill`);
    if (!slider || !Number.isInteger(skill)) return;
    slider.value = Math.min(Number(slider.max), Math.max(Number(slider.min), skill));
    slider.dispatchEvent(new Event('input'));
}

function selectPlayerProfile(slot) {
    const profileSelect = document.getElementById(`p${slot}Profile`);
    const playerId = profileSelect?.value;
    const nameInput = document.getElementById(`p${slot}Name`);
    if (playerId === getAddNewPlayerValue()) {
        profileSelect.value = '';
        if (nameInput) nameInput.value = '';
        openPlayerProfileModal(slot);
        return;
    }
    if (!playerId) {
        if (nameInput) nameInput.value = '';
        return;
    }
    const profile = PoolStorage.loadProfiles().find(item => item.playerId === playerId);
    if (!profile) return;
    nameInput.value = profile.name;
    const skill = profile.skillLevels[getSetupGameMode()];
    if (Number.isInteger(skill)) setSetupSkill(slot, skill);
}

function refreshSelectedProfileSkills() {
    [1, 2].forEach(selectPlayerProfile);
}

function openPlayerProfileModal(slot = null, playerId = null) {
    profileEditorTargetSlot = slot;
    const profile = playerId
        ? PoolStorage.loadProfiles().find(item => item.playerId === playerId)
        : null;
    document.getElementById('playerProfileModalLabel').textContent = profile ? 'Edit Player' : 'Add Player';
    document.getElementById('profileEditorId').value = profile?.playerId || '';
    document.getElementById('profileEditorName').value = profile?.name || '';
    document.getElementById('profileSkill8').value = profile?.skillLevels['8-ball'] ?? 4;
    document.getElementById('profileSkill9').value = profile?.skillLevels['9-ball'] ?? 5;
    document.getElementById('profileSkill10').value = profile?.skillLevels['10-ball'] ?? 4;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('playerProfileModal')).show();
    setTimeout(() => document.getElementById('profileEditorName').focus(), 150);
}

function constrainPlayerProfileSkill(input, mode) {
    const range = PROFILE_SKILL_RANGES[mode];
    if (!range || input.value === '') return;
    const value = input.valueAsNumber;
    if (!Number.isFinite(value)) {
        input.value = DEFAULT_PROFILE_SKILL_LEVELS[mode];
        return;
    }
    input.value = Math.min(range.maximum, Math.max(range.minimum, Math.round(value)));
}

function savePlayerProfileModal() {
    const nameInput = document.getElementById('profileEditorName');
    const skillInputs = {
        '8-ball': document.getElementById('profileSkill8'),
        '9-ball': document.getElementById('profileSkill9'),
        '10-ball': document.getElementById('profileSkill10')
    };
    nameInput.setCustomValidity('');
    let name;
    try {
        name = sanitizePlayerProfileName(nameInput.value);
    } catch (error) {
        nameInput.setCustomValidity(error.message);
        nameInput.reportValidity();
        return;
    }
    nameInput.value = name;

    const skillLevels = {};
    for (const [mode, input] of Object.entries(skillInputs)) {
        input.setCustomValidity('');
        const value = input.valueAsNumber;
        const range = PROFILE_SKILL_RANGES[mode];
        if (!Number.isInteger(value) || value < range.minimum || value > range.maximum) {
            input.setCustomValidity(`${mode} skill level must be a whole number from ${range.minimum} to ${range.maximum}.`);
            input.reportValidity();
            return;
        }
        skillLevels[mode] = value;
    }

    let profile;
    try {
        profile = PoolStorage.upsertProfile({
            playerId: document.getElementById('profileEditorId').value || undefined,
            name,
            skillLevels
        });
    } catch (error) {
        console.error('Player profile could not be saved:', error);
        alert(error.message);
        return;
    }
    refreshPlayerProfileUI();
    if (profileEditorTargetSlot) {
        document.getElementById(`p${profileEditorTargetSlot}Profile`).value = profile.playerId;
        selectPlayerProfile(profileEditorTargetSlot);
    } else {
        [1, 2].forEach(slot => {
            if (document.getElementById(`p${slot}Profile`).value === profile.playerId) selectPlayerProfile(slot);
        });
    }
    updateLifetimeStats();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('playerProfileModal')).hide();
}

function deleteStoredPlayer(playerId) {
    const profile = PoolStorage.loadProfiles().find(item => item.playerId === playerId);
    if (!profile || !confirm(`Delete the stored profile for ${profile.name}? Historical matches will remain.`)) return;
    PoolStorage.deleteProfile(playerId);
    refreshPlayerProfileUI();
    updateLifetimeStats();
}

function refreshMappedPlayerViews() {
    refreshPlayerProfileUI();
    updateLifetimeStats();
    displayHistory();
}

function createProfilesFromHistoryUI() {
    if (!confirm('Create profiles and map matches that use exactly the same player name?')) return;
    const result = PoolStorage.createProfilesFromHistory();
    refreshMappedPlayerViews();
    alert(`${result.created} profiles created and ${result.mapped} match entries mapped.`);
}

function mapExactPlayerNamesUI() {
    const mapped = PoolStorage.mapExactProfileNames();
    refreshMappedPlayerViews();
    alert(`${mapped} match entries mapped by exact player name.`);
}

function mapSelectedHistoryName() {
    const sourceName = document.getElementById('historyPlayerNameSelect')?.value;
    const playerId = document.getElementById('historyProfileSelect')?.value;
    if (!sourceName || !playerId) {
        alert('Choose both a historical name and a stored profile.');
        return;
    }
    const mapped = PoolStorage.mapHistoryNameToProfile(sourceName, playerId);
    refreshMappedPlayerViews();
    alert(`${mapped} match entries mapped.`);
}

function refreshPlayerProfileUI() {
    const profiles = PoolStorage.loadProfiles().slice().sort((a, b) => a.name.localeCompare(b.name));
    [1, 2].forEach(slot => {
        const select = document.getElementById(`p${slot}Profile`);
        if (!select) return;
        const selected = select.value;
        select.replaceChildren(new Option(`Choose Player ${slot}`, ''));
        select.add(new Option('＋ Add New Player…', getAddNewPlayerValue()));
        profiles.forEach(profile => select.add(new Option(profile.name, profile.playerId)));
        if (profiles.some(profile => profile.playerId === selected)) select.value = selected;
    });

    const profileList = document.getElementById('stored-player-list');
    if (profileList) {
        profileList.innerHTML = profiles.length
            ? profiles.map(profile => {
                const skills = ['8-ball', '9-ball', '10-ball']
                    .filter(mode => profile.skillLevels[mode] != null)
                    .map(mode => `${mode}: ${profile.skillLevels[mode]}`)
                    .join(' · ');
                return `<div class="d-flex justify-content-between align-items-center border-bottom py-2 gap-2">
                    <div><strong>${escapeHtml(profile.name)}</strong><br><small>${escapeHtml(skills || 'No skill levels saved')}</small></div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" type="button" onclick="openPlayerProfileModal(null, '${profile.playerId}')">Edit</button>
                        <button class="btn btn-outline-danger" type="button" onclick="deleteStoredPlayer('${profile.playerId}')">Delete</button>
                    </div>
                </div>`;
            }).join('')
            : '<p class="text-muted">No stored players yet.</p>';
    }

    const profileMapSelect = document.getElementById('historyProfileSelect');
    if (profileMapSelect) {
        const selected = profileMapSelect.value;
        profileMapSelect.replaceChildren(new Option('Choose stored player', ''));
        profiles.forEach(profile => profileMapSelect.add(new Option(profile.name, profile.playerId)));
        if (profiles.some(profile => profile.playerId === selected)) profileMapSelect.value = selected;
    }

    const historyNameSelect = document.getElementById('historyPlayerNameSelect');
    if (historyNameSelect) {
        const selected = historyNameSelect.value;
        const names = [...new Set(PoolStorage.loadHistory().flatMap(match =>
            match.players.map(player => player.name)
        ))].sort((a, b) => a.localeCompare(b));
        historyNameSelect.replaceChildren(new Option('Choose historical name', ''));
        names.forEach(name => historyNameSelect.add(new Option(name, name)));
        if (names.includes(selected)) historyNameSelect.value = selected;
    }

}

document.addEventListener('DOMContentLoaded', () => {
    refreshPlayerProfileUI();
});
