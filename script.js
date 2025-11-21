// Configuration
const PLAYER_ID = '1641705'; // Victor Wembanyama
const CURRENT_SEASON = '2025-26'; // Saison actuelle
const TEAM_ID = '1610612759'; // San Antonio Spurs

// Cache pour les données
let cachedGameLog = null;
let cachedShotChart = null;

// Headers pour l'API NBA
const NBA_HEADERS = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://www.nba.com',
    'Referer': 'https://www.nba.com/',
    'Connection': 'keep-alive'
};

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏀 Script chargé, début initialisation...');
    setupVideoControls();
    console.log('🎬 Vidéos configurées');
    await loadAllData();
    console.log('✅ Toutes les données chargées');
});

// Configuration des contrôles vidéo
function setupVideoControls() {
    const videos = document.querySelectorAll('.video-background video');
    const volumeBtns = document.querySelectorAll('.volume-btn');

    volumeBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const video = videos[index];
            if (video.muted) {
                video.muted = false;
                btn.textContent = '🔇';
            } else {
                video.muted = true;
                btn.textContent = '🔊';
            }
        });
    });
}

// Charger toutes les données
async function loadAllData() {
    try {
        // Charger le game log (source unique de données)
        await loadGameLog();
        
        // Calculer et afficher toutes les stats
        displayHeroStats();
        displayLastGame();
        displayBlocksStats();
        displayPointsEvolution();
        displayShootingStats();
        displayDefenseStats();
        displayImpactStats();
        
        // Charger le shot chart séparément
        await loadShotChart();
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

// Charger le game log (SEUL ENDPOINT FIABLE)
async function loadGameLog() {
    if (cachedGameLog) return cachedGameLog;

    try {
        // Utiliser le proxy local pour contourner CORS
        const url = `/api/nba/playergamelog?PlayerID=${PLAYER_ID}&Season=${CURRENT_SEASON}&SeasonType=Regular+Season`;
        
        console.log('📡 Requête API:', url);
        
        const response = await fetch(url, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        const headers = data.resultSets[0].headers;
        const rows = data.resultSets[0].rowSet;

        // Transformer en objets
        cachedGameLog = rows.map(row => {
            const game = {};
            headers.forEach((header, index) => {
                game[header] = row[index];
            });
            return game;
        });

        return cachedGameLog;
    } catch (error) {
        console.error('Erreur lors du chargement du game log:', error);
        throw error;
    }
}

// Afficher les stats du hero
function displayHeroStats() {
    if (!cachedGameLog || cachedGameLog.length === 0) return;

    const totalGames = cachedGameLog.length;
    const totalPoints = cachedGameLog.reduce((sum, game) => sum + game.PTS, 0);
    const totalBlocks = cachedGameLog.reduce((sum, game) => sum + game.BLK, 0);
    const totalRebounds = cachedGameLog.reduce((sum, game) => sum + game.REB, 0);

    document.getElementById('hero-ppg').textContent = (totalPoints / totalGames).toFixed(1);
    document.getElementById('hero-bpg').textContent = (totalBlocks / totalGames).toFixed(1);
    document.getElementById('hero-rpg').textContent = (totalRebounds / totalGames).toFixed(1);
}

// Afficher le dernier match
function displayLastGame() {
    if (!cachedGameLog || cachedGameLog.length === 0) return;

    const lastGame = cachedGameLog[0];
    const card = document.getElementById('last-game-card');

    card.innerHTML = `
        <div class="game-header">
            <div class="game-date">${formatDate(lastGame.GAME_DATE)}</div>
            <div class="game-matchup">${lastGame.MATCHUP}</div>
            <div class="game-result ${lastGame.WL === 'W' ? 'win' : 'loss'}">
                ${lastGame.WL === 'W' ? 'VICTOIRE' : 'DÉFAITE'}
            </div>
        </div>
        <div class="game-stats-grid">
            <div class="game-stat-item">
                <span class="game-stat-value">${lastGame.PTS}</span>
                <span class="game-stat-label">Points</span>
            </div>
            <div class="game-stat-item">
                <span class="game-stat-value">${lastGame.REB}</span>
                <span class="game-stat-label">Rebonds</span>
            </div>
            <div class="game-stat-item">
                <span class="game-stat-value">${lastGame.AST}</span>
                <span class="game-stat-label">Passes</span>
            </div>
            <div class="game-stat-item">
                <span class="game-stat-value">${lastGame.BLK}</span>
                <span class="game-stat-label">Contres</span>
            </div>
            <div class="game-stat-item">
                <span class="game-stat-value">${lastGame.STL}</span>
                <span class="game-stat-label">Interceptions</span>
            </div>
            <div class="game-stat-item">
                <span class="game-stat-value">${((lastGame.FGM / lastGame.FGA) * 100).toFixed(1)}%</span>
                <span class="game-stat-label">FG%</span>
            </div>
        </div>
    `;
}

// Afficher les stats de blocks
function displayBlocksStats() {
    if (!cachedGameLog || cachedGameLog.length === 0) return;

    const totalBlocks = cachedGameLog.reduce((sum, game) => sum + game.BLK, 0);
    const avgBlocks = totalBlocks / cachedGameLog.length;
    const maxBlocks = Math.max(...cachedGameLog.map(game => game.BLK));

    document.getElementById('total-blocks').textContent = totalBlocks;
    document.getElementById('avg-blocks').textContent = avgBlocks.toFixed(1);
    document.getElementById('max-blocks').textContent = maxBlocks;
}

// Afficher l'évolution des points
function displayPointsEvolution() {
    if (!cachedGameLog || cachedGameLog.length === 0) return;

    const canvas = document.getElementById('points-chart');
    const ctx = canvas.getContext('2d');

    // Préparer les données (inverser pour afficher chronologiquement)
    const games = [...cachedGameLog].reverse();
    const labels = games.map((game, index) => `Match ${index + 1}`);
    const points = games.map(game => game.PTS);

    // Configuration du canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = 500;

    const padding = 50;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxPoints = Math.max(...points) + 5;

    // Dessiner les axes
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Dessiner la grille
    ctx.strokeStyle = 'rgba(192, 192, 192, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();

        // Labels Y
        ctx.fillStyle = '#c0c0c0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxPoints - (maxPoints / 5) * i), padding - 10, y + 5);
    }

    // Dessiner la courbe
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();

    points.forEach((pts, index) => {
        const x = padding + (chartWidth / (points.length - 1)) * index;
        const y = canvas.height - padding - (pts / maxPoints) * chartHeight;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Dessiner les points
    points.forEach((pts, index) => {
        const x = padding + (chartWidth / (points.length - 1)) * index;
        const y = canvas.height - padding - (pts / maxPoints) * chartHeight;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Ombre pour l'effet glow
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Labels X (tous les 5 matchs)
    ctx.fillStyle = '#c0c0c0';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    games.forEach((game, index) => {
        if (index % 5 === 0 || index === games.length - 1) {
            const x = padding + (chartWidth / (points.length - 1)) * index;
            ctx.fillText(`M${index + 1}`, x, canvas.height - padding + 20);
        }
    });
}

// Afficher les stats de shoot
function displayShootingStats() {
    if (!cachedGameLog || cachedGameLog.length === 0) return;

    const totalFGM = cachedGameLog.reduce((sum, game) => sum + game.FGM, 0);
    const totalFGA = cachedGameLog.reduce((sum, game) => sum + game.FGA, 0);
    const totalThreeMade = cachedGameLog.reduce((sum, game) => sum + game.FG3M, 0);
    const totalThreeAttempts = cachedGameLog.reduce((sum, game) => sum + game.FG3A, 0);
    const totalFTM = cachedGameLog.reduce((sum, game) => sum + game.FTM, 0);
    const totalFTA = cachedGameLog.reduce((sum, game) => sum + game.FTA, 0);

    const fgPct = (totalFGM / totalFGA) * 100;
    const threePct = (totalThreeMade / totalThreeAttempts) * 100;
    const ftPct = (totalFTM / totalFTA) * 100;

    document.getElementById('fg-pct').textContent = `${fgPct.toFixed(1)}%`;
    document.getElementById('three-pct').textContent = `${threePct.toFixed(1)}%`;
    document.getElementById('ft-pct').textContent = `${ftPct.toFixed(1)}%`;

    // Animer les cercles de progression
    animateCircle('fg-circle', fgPct);
    animateCircle('three-circle', threePct);
    animateCircle('ft-circle', ftPct);
}

// Animer un cercle de progression
function animateCircle(elementId, percentage) {
    const circle = document.getElementById(elementId);
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    setTimeout(() => {
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }, 100);
}

// Afficher les stats défensives
function displayDefenseStats() {
    if (!cachedGameLog || cachedGameLog.length === 0) return;

    const totalSteals = cachedGameLog.reduce((sum, game) => sum + game.STL, 0);
    const avgSteals = totalSteals / cachedGameLog.length;

    const totalDefReb = cachedGameLog.reduce((sum, game) => sum + game.DREB, 0);

    document.getElementById('steals-avg').textContent = avgSteals.toFixed(1);
    document.getElementById('def-rebounds').textContent = totalDefReb;
}

// Afficher les stats d'impact global
function displayImpactStats() {
    if (!cachedGameLog || cachedGameLog.length === 0) return;

    const totalPoints = cachedGameLog.reduce((sum, game) => sum + game.PTS, 0);
    const totalAssists = cachedGameLog.reduce((sum, game) => sum + game.AST, 0);
    const totalRebounds = cachedGameLog.reduce((sum, game) => sum + game.REB, 0);
    const gamesPlayed = cachedGameLog.length;

    document.getElementById('total-points').textContent = totalPoints;
    document.getElementById('total-assists').textContent = totalAssists;
    document.getElementById('total-rebounds').textContent = totalRebounds;
    document.getElementById('games-played').textContent = gamesPlayed;
}

// Charger le shot chart
async function loadShotChart() {
    if (cachedShotChart) {
        displayShotChart();
        return;
    }

    try {
        // TOUS les paramètres obligatoires pour shotchartdetail
        const params = new URLSearchParams({
            PlayerID: PLAYER_ID,
            Season: CURRENT_SEASON,
            SeasonType: 'Regular Season',
            TeamID: TEAM_ID,
            GameID: '',
            Outcome: '',
            Location: '',
            Month: '0',
            SeasonSegment: '',
            DateFrom: '',
            DateTo: '',
            OpponentTeamID: '0',
            VsConference: '',
            VsDivision: '',
            Position: '',
            RookieYear: '',
            GameSegment: '',
            Period: '0',
            LastNGames: '0',
            ContextMeasure: 'FGA'
        });

        // Utiliser le proxy local
        const url = `/api/nba/shotchartdetail?${params}`;
        
        const response = await fetch(url, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        const headers = data.resultSets[0].headers;
        const rows = data.resultSets[0].rowSet;

        cachedShotChart = rows.map(row => {
            const shot = {};
            headers.forEach((header, index) => {
                shot[header] = row[index];
            });
            return shot;
        });

        displayShotChart();
    } catch (error) {
        console.error('Erreur lors du chargement du shot chart:', error);
    }
}

// Afficher le shot chart
function displayShotChart() {
    const canvas = document.getElementById('shot-chart-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 500;
    canvas.height = 470;

    // Dessiner le terrain
    drawCourt(ctx, canvas.width, canvas.height);

    // Dessiner les tirs
    if (cachedShotChart && cachedShotChart.length > 0) {
        cachedShotChart.forEach(shot => {
            const x = (shot.LOC_X / 10) + canvas.width / 2;
            const y = canvas.height - (shot.LOC_Y / 10) - 40;
            const made = shot.SHOT_MADE_FLAG === 1;

            ctx.fillStyle = made ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 68, 68, 0.6)';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// Dessiner le terrain de basket
function drawCourt(ctx, width, height) {
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 2;

    // Périmètre
    ctx.strokeRect(0, 0, width, height);

    // Ligne des 3 points
    ctx.beginPath();
    ctx.arc(width / 2, height - 40, 237.5, 0.3, Math.PI - 0.3);
    ctx.stroke();

    // Ligne de lancer franc
    ctx.strokeRect(width / 2 - 80, height - 230, 160, 190);

    // Cercle du lancer franc
    ctx.beginPath();
    ctx.arc(width / 2, height - 230, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Panier
    ctx.beginPath();
    ctx.arc(width / 2, height - 40, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Zone restreinte
    ctx.beginPath();
    ctx.arc(width / 2, height - 40, 40, 0, Math.PI, true);
    ctx.stroke();
}

// Formater une date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});