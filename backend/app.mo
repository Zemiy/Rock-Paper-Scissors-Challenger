import Nat "mo:base/Nat";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Random "mo:base/Random";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";

actor RockPaperScissorsAI {

    public type Choice = {
        #rock;
        #paper;
        #scissors;
    };

    public type Result = {
        #win;
        #lose;
        #draw;
    };

    public type GameRecord = {
        timestamp : Time.Time;
        player : Choice;
        bot : Choice;
        result : Result;
    };

    public type Score = {
        wins : Nat;
        losses : Nat;
        draws : Nat;
        totalGames : Nat;
    };

    public type PlayerStats = {
        rock : Nat;
        paper : Nat;
        scissors : Nat;
    };

    public type PlayerData = {
        score : Score;
        history : [GameRecord];
        stats : PlayerStats;
    };

    // Private variables for game state
    private stable var playersEntries : [(Text, PlayerData)] = [];
    private var players = HashMap.HashMap<Text, PlayerData>(0, Text.equal, Text.hash);

    // Current session username
    private stable var currentUser : ?Text = null;

    // System upgrade hooks
    system func preupgrade() {
        playersEntries := Iter.toArray(players.entries());
    };

    system func postupgrade() {
        players := HashMap.fromIter<Text, PlayerData>(playersEntries.vals(), playersEntries.size(), Text.equal, Text.hash);
        playersEntries := [];
    };

    // LOGIN API
    public func login(username : Text) : async Text {
        currentUser := ?username;
        
        switch (players.get(username)) {
            case null {
                let newData : PlayerData = {
                    score = {wins = 0; losses = 0; draws = 0; totalGames = 0};
                    history = [];
                    stats = {rock = 0; paper = 0; scissors = 0};
                };
                players.put(username, newData);
            };
            case (?_) {
                // User already exists, just login
            };
        };
        
        "Logged in as " # username
    };

    // LOGOUT API
    public func logout() : async Text {
        currentUser := null;
        "Logged out."
    };

    // Get current user helper
    private func getCurrentUser() : Text {
        switch (currentUser) {
            case (?user) { user };
            case null { 
                Debug.trap("No user logged in.");
            };
        }
    };

    // AI prediction of next move
    private func predictPlayerNextMove(stats : PlayerStats, totalGames : Nat) : Choice {
        if (totalGames < 3) {
            return randomBotChoice();
        };

        let maxChoice = if (stats.rock >= stats.paper and stats.rock >= stats.scissors) {
            #rock;
        } else if (stats.paper >= stats.rock and stats.paper >= stats.scissors) {
            #paper;
        } else {
            #scissors;
        };

        // Counter the most frequent choice
        switch maxChoice {
            case (#rock) { #paper };
            case (#paper) { #scissors };
            case (#scissors) { #rock };
        }
    };

    // Simple random choice for bot
    private func randomBotChoice() : Choice {
        let seed = Int.abs(Time.now()) % 3;
        switch (seed) {
            case (0) { #rock };
            case (1) { #paper };
            case (_) { #scissors };
        }
    };

    // Determine game result
    private func getResult(player : Choice, bot : Choice) : Result {
        if (player == bot) return #draw;

        switch (player, bot) {
            case (#rock, #scissors) { #win };
            case (#scissors, #paper) { #win };
            case (#paper, #rock) { #win };
            case (_, _) { #lose };
        }
    };

    // Update player stats
    private func updatePlayerStats(stats : PlayerStats, choice : Choice) : PlayerStats {
        switch choice {
            case (#rock) { 
                {rock = stats.rock + 1; paper = stats.paper; scissors = stats.scissors}
            };
            case (#paper) { 
                {rock = stats.rock; paper = stats.paper + 1; scissors = stats.scissors}
            };
            case (#scissors) { 
                {rock = stats.rock; paper = stats.paper; scissors = stats.scissors + 1}
            };
        }
    };

    // Update player score
    private func updatePlayerScore(score : Score, result : Result) : Score {
        switch result {
            case (#win) { 
                {wins = score.wins + 1; losses = score.losses; draws = score.draws; totalGames = score.totalGames + 1}
            };
            case (#lose) { 
                {wins = score.wins; losses = score.losses + 1; draws = score.draws; totalGames = score.totalGames + 1}
            };
            case (#draw) { 
                {wins = score.wins; losses = score.losses; draws = score.draws + 1; totalGames = score.totalGames + 1}
            };
        }
    };

    // API: Play game
    public func play(playerChoice : Choice) : async {
        player : Choice;
        bot : Choice;
        result : Result;
        currentScore : Score;
    } {
        let username = getCurrentUser();
        
        let playerData = switch (players.get(username)) {
            case (?data) { data };
            case null { 
                Debug.trap("User data not found.");
            };
        };

        // Get bot choice based on AI prediction
        let botChoice = predictPlayerNextMove(playerData.stats, playerData.score.totalGames);
        let gameResult = getResult(playerChoice, botChoice);

        // Update player statistics
        let newStats = updatePlayerStats(playerData.stats, playerChoice);
        let newScore = updatePlayerScore(playerData.score, gameResult);

        // Create new game record
        let record : GameRecord = {
            timestamp = Time.now();
            player = playerChoice;
            bot = botChoice;
            result = gameResult;
        };
        let newHistory = Array.append<GameRecord>(playerData.history, [record]);

        // Update player data
        let updatedData : PlayerData = {
            score = newScore;
            history = newHistory;
            stats = newStats;
        };
        players.put(username, updatedData);

        {
            player = playerChoice;
            bot = botChoice;
            result = gameResult;
            currentScore = newScore;
        }
    };

    // API: Get current user score
    public query func getScore() : async ?Score {
        let username = switch (currentUser) {
            case (?user) { user };
            case null { return null };
        };
        
        switch (players.get(username)) {
            case (?data) { ?data.score };
            case null { null };
        }
    };

    // API: Get current user history
    public query func getHistory() : async ?[GameRecord] {
        let username = switch (currentUser) {
            case (?user) { user };
            case null { return null };
        };
        
        switch (players.get(username)) {
            case (?data) { ?data.history };
            case null { null };
        }
    };

    // API: Get current user stats
    public query func getStats() : async ?PlayerStats {
        let username = switch (currentUser) {
            case (?user) { user };
            case null { return null };
        };
        
        switch (players.get(username)) {
            case (?data) { ?data.stats };
            case null { null };
        }
    };

    // API: Reset current user data
    public func resetGame() : async Text {
        let username = getCurrentUser();
        
        let resetData : PlayerData = {
            score = {wins = 0; losses = 0; draws = 0; totalGames = 0};
            history = [];
            stats = {rock = 0; paper = 0; scissors = 0};
        };
        
        players.put(username, resetData);
        "Game data reset for " # username
    };

    // API: Get current logged in user
    public query func getCurrentUserInfo() : async ?Text {
        currentUser
    };

    // API: Get all registered users (for admin purposes)
    public query func getAllUsers() : async [Text] {
        Iter.toArray(players.keys())
    };
}