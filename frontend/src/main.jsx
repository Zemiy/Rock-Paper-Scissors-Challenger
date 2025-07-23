// Import the Actor and HttpAgent from agent-js
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/rps_ai_backend/rps_ai_backend.did.js';

// Create agent and actor
const agent = new HttpAgent({ host: "http://localhost:4943" });
let actor;

// In development, fetch root key for local replica
if (process.env.NODE_ENV !== "production") {
    agent.fetchRootKey();
}

// Initialize actor
async function initActor() {
    const canisterId = process.env.CANISTER_ID_RPS_AI_BACKEND || 'rrkah-fqaaa-aaaaa-aaaaq-cai';
    actor = Actor.createActor(idlFactory, {
        agent,
        canisterId,
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    await initActor();
    
    // Check if user is already logged in
    try {
        const currentUser = await actor.getCurrentUserInfo();
        if (currentUser && currentUser.length > 0) {
            showGameSection(currentUser[0]);
        }
    } catch (error) {
        console.log('No user logged in');
    }
});

// DOM Elements
const loginSection = document.getElementById('loginSection');
const gameSection = document.getElementById('gameSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const usernameInput = document.getElementById('usernameInput');
const currentUserSpan = document.getElementById('currentUser');

// Choice mappings
const choiceIcons = {
    rock: '🪨',
    paper: '📄',
    scissors: '✂️'
};

// Utility functions
function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showGameSection(username) {
    loginSection.classList.add('hidden');
    gameSection.classList.remove('hidden');
    currentUserSpan.textContent = `👤 Player: ${username}`;
    updateScore();
}

function showLoginSection() {
    gameSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    currentUserSpan.textContent = '👤 Player: ';
}

// Login function
async function login() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Please enter a username!');
        return;
    }
    
    if (username.length > 20) {
        alert('Username must be 20 characters or less!');
        return;
    }
    
    try {
        showLoading();
        const result = await actor.login(username);
        console.log(result);
        showGameSection(username);
        usernameInput.value = '';
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to login. Please try again.');
    } finally {
        hideLoading();
    }
}

// Logout function
async function logout() {
    try {
        showLoading();
        const result = await actor.logout();
        console.log(result);
        showLoginSection();
        
        // Reset game display
        document.getElementById('playerChoice').textContent = '❓';
        document.getElementById('botChoice').textContent = '❓';
        document.getElementById('gameResult').textContent = '';
        document.getElementById('gameResult').className = 'result-display';
        
        // Hide panels
        document.getElementById('historyPanel').classList.add('hidden');
        document.getElementById('statsPanel').classList.add('hidden');
        
        alert('Game data has been reset successfully!');
        
    } catch (error) {
        console.error('Reset game error:', error);
        alert('Failed to reset game data. Please try again.');
    } finally {
        hideLoading();
    }
}

// Enter key support for login
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const loginSection = document.getElementById('loginSection');
        if (!loginSection.classList.contains('hidden')) {
            login();
        }
    }
});

// Make functions globally available
window.login = login;
window.logout = logout;
window.playGame = playGame;
window.toggleHistory = toggleHistory;
window.toggleStats = toggleStats;
window.resetGame = resetGame;
        document.getElementById('statsPanel').classList.add('hidden');
        
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        hideLoading();
    }
}

// Play game function
async function playGame(playerChoice) {
    try {
        showLoading();
        disableChoiceButtons(true);
        
        // Convert choice to the format expected by the backend
        const choice = { [playerChoice]: null };
        
        const result = await actor.play(choice);
        
        // Display results
        displayGameResult(result);
        
        // Update score
        updateScoreDisplay(result.currentScore);
        
    } catch (error) {
        console.error('Play game error:', error);
        alert('Failed to play game. Please try again.');
    } finally {
        hideLoading();
        disableChoiceButtons(false);
    }
}

// Display game result
function displayGameResult(result) {
    const playerChoiceEl = document.getElementById('playerChoice');
    const botChoiceEl = document.getElementById('botChoice');
    const gameResultEl = document.getElementById('gameResult');
    
    // Get choice names
    const playerChoice = Object.keys(result.player)[0];
    const botChoice = Object.keys(result.bot)[0];
    const gameResult = Object.keys(result.result)[0];
    
    // Animate choice displays
    playerChoiceEl.classList.add('animate');
    botChoiceEl.classList.add('animate');
    
    setTimeout(() => {
        playerChoiceEl.textContent = choiceIcons[playerChoice];
        botChoiceEl.textContent = choiceIcons[botChoice];
        
        // Display result
        gameResultEl.textContent = getResultText(gameResult);
        gameResultEl.className = `result-display result-${gameResult}`;
        
        // Remove animation classes
        playerChoiceEl.classList.remove('animate');
        botChoiceEl.classList.remove('animate');
    }, 500);
}

// Get result text
function getResultText(result) {
    switch (result) {
        case 'win':
            return '🎉 You Win!';
        case 'lose':
            return '😭 You Lose!';
        case 'draw':
            return '🤝 It\'s a Draw!';
        default:
            return '';
    }
}

// Update score display
function updateScoreDisplay(score) {
    document.getElementById('winsCount').textContent = score.wins.toString();
    document.getElementById('lossesCount').textContent = score.losses.toString();
    document.getElementById('drawsCount').textContent = score.draws.toString();
    document.getElementById('totalGames').textContent = score.totalGames.toString();
}

// Update score from backend
async function updateScore() {
    try {
        const score = await actor.getScore();
        if (score && score.length > 0) {
            updateScoreDisplay(score[0]);
        }
    } catch (error) {
        console.error('Failed to get score:', error);
    }
}

// Disable/enable choice buttons
function disableChoiceButtons(disabled) {
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(btn => {
        if (disabled) {
            btn.classList.add('disabled');
            btn.disabled = true;
        } else {
            btn.classList.remove('disabled');
            btn.disabled = false;
        }
    });
}

// Toggle history panel
async function toggleHistory() {
    const panel = document.getElementById('historyPanel');
    
    if (panel.classList.contains('hidden')) {
        try {
            showLoading();
            const history = await actor.getHistory();
            displayHistory(history);
            panel.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to get history:', error);
            alert('Failed to load history.');
        } finally {
            hideLoading();
        }
    } else {
        panel.classList.add('hidden');
    }
}

// Display history
function displayHistory(history) {
    const content = document.getElementById('historyContent');
    
    if (!history || history.length === 0 || history[0].length === 0) {
        content.innerHTML = '<p style="text-align: center; color: #666;">No games played yet.</p>';
        return;
    }
    
    const historyData = history[0];
    let html = '';
    
    // Show last 10 games
    const recentGames = historyData.slice(-10).reverse();
    
    recentGames.forEach(game => {
        const playerChoice = Object.keys(game.player)[0];
        const botChoice = Object.keys(game.bot)[0];
        const result = Object.keys(game.result)[0];
        const date = new Date(Number(game.timestamp) / 1000000).toLocaleString();
        
        html += `
            <div class="history-item">
                <div class="history-time">${date}</div>
                <div class="history-choices">
                    You: ${choiceIcons[playerChoice]} vs AI: ${choiceIcons[botChoice]}
                </div>
                <div class="history-result result-${result}">${getResultText(result)}</div>
            </div>
        `;
    });
    
    content.innerHTML = html;
}

// Toggle stats panel
async function toggleStats() {
    const panel = document.getElementById('statsPanel');
    
    if (panel.classList.contains('hidden')) {
        try {
            showLoading();
            const stats = await actor.getStats();
            displayStats(stats);
            panel.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to get stats:', error);
            alert('Failed to load stats.');
        } finally {
            hideLoading();
        }
    } else {
        panel.classList.add('hidden');
    }
}

// Display stats
function displayStats(stats) {
    if (!stats || stats.length === 0) {
        return;
    }
    
    const statsData = stats[0];
    document.getElementById('rockCount').textContent = statsData.rock.toString();
    document.getElementById('paperCount').textContent = statsData.paper.toString();
    document.getElementById('scissorsCount').textContent = statsData.scissors.toString();
}

// Reset game
async function resetGame() {
    if (!confirm('Are you sure you want to reset all your game data? This cannot be undone.')) {
        return;
    }
    
    try {
        showLoading();
        const result = await actor.resetGame();
        console.log(result);
        
        // Reset display
        updateScoreDisplay({wins: 0, losses: 0, draws: 0, totalGames: 0});
        document.getElementById('playerChoice').textContent = '❓';
        document.getElementById('botChoice').textContent = '❓';
        document.getElementById('gameResult').textContent = '';
        document.getElementById('gameResult').className = 'result-display';
        
        // Hide panels
        document.getElementById('historyPanel').classList.add('hidden');