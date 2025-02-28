const fs = require("fs");
const axios = require("axios");
const path = require("path");
const inquirer = require("inquirer");

const config = {
  baseURL: "https://app-api.jp.stork-oracle.network/v1",
  authURL: "https://api.jp.stork-oracle.network/auth",
  tokenPath: path.join(__dirname, "tokens.json"),
  intervalSeconds: 60, // Polling interval in seconds
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  origin: "chrome-extension://knnliglhgkmlblppdejchidfihjnockl",
};

function getFormattedDate() {
  const now = new Date();
  return now.toISOString().replace("T", " ").substr(0, 19);
}

function log(message, type = "INFO") {
  console.log(`[${getFormattedDate()}] [${type}] ${message}`);
}

function showBanner() {
  console.log(`\n==========================================`);
  console.log(`=             Stork Auto Bot           =`);
  console.log(`=                                      =`);
  console.log(`=               Batang Eds             =`);
  console.log(`==========================================\n`);
}

async function getTokens() {
  try {
    log(`Reading token file: ${config.tokenPath}...`);
    if (!fs.existsSync(config.tokenPath)) {
      throw new Error(`Token file not found: ${config.tokenPath}`);
    }
    
    const tokensData = await fs.promises.readFile(config.tokenPath, "utf8");
    const tokens = JSON.parse(tokensData);
    
    if (!tokens.accessToken || tokens.accessToken.length < 20) {
      throw new Error("Invalid access token (too short or empty)");
    }

    log(`Successfully read access token: ${tokens.accessToken.substring(0, 10)}...`);
    return tokens;
  } catch (error) {
    log(`Error reading token: ${error.message}`, "ERROR");
    throw error;
  }
}

async function refreshTokens(refreshToken) {
  try {
    log("Refreshing access token...");
    const response = await axios.post(`${config.authURL}/refresh`, { refresh_token: refreshToken }, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": config.userAgent,
        "Origin": config.origin,
      },
    });

    if (!response.data || !response.data.access_token) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokens = {
      accessToken: response.data.access_token,
      idToken: response.data.id_token || "",
      refreshToken: response.data.refresh_token || refreshToken, // Use old refreshToken if none is returned
      isAuthenticated: true,
      isVerifying: false,
    };

    log("Token refreshed successfully!");
    await fs.promises.writeFile(config.tokenPath, JSON.stringify(tokens, null, 2), "utf8");
    return tokens;
  } catch (error) {
    log(`Token refresh failed: ${error.message}`, "ERROR");
    throw error;
  }
}

async function getUserStats(tokens) {
  try {
    log("Fetching user stats...");
    const response = await axios.get(`${config.baseURL}/me`, {
      headers: {
        "Authorization": `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": config.userAgent,
      },
    });
    if (response.status === 401) {
      log("Access token expired, attempting refresh...", "WARN");
      tokens = await refreshTokens(tokens.refreshToken);
      return getUserStats(tokens);
    }
    if (response.status !== 200) {
      log(`API response status: ${response.status}`, "WARN");
      return null;
    }
    return response.data.data;
  } catch (error) {
    log(`Error fetching user stats: ${error.message}`, "ERROR");
    return null;
  }
}

async function runValidationProcess() {
  try {
    log("----- Starting Validation Process -----");
    let tokens = await getTokens();
    const userData = await getUserStats(tokens);
    if (userData) {
      log(`User Email: ${userData.email || "Unknown"}`);
      log(`Total Validations: ${userData.stats.stork_signed_prices_valid_count || 0}`);
    }
  } catch (error) {
    log(`Validation process stopped: ${error.message}`, "ERROR");
  }
}

async function startApp() {
  showBanner();
  log(`==========================================`);
  log(`STORK ORACLE Validator Bot Activated`);
  log(`Interval: ${config.intervalSeconds} seconds`);
  log(`Token Path: ${config.tokenPath}`);
  log(`Auto-refresh: Enabled`);
  log(`==========================================`);
  
  runValidationProcess();
  setInterval(runValidationProcess, config.intervalSeconds * 1000);
}

startApp();
