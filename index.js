const fs = require("fs");
const axios = require("axios");
const path = require("path");

const config = {
  baseURL: "https://app-api.jp.stork-oracle.network/v1",
  authURL: "https://api.jp.stork-oracle.network/auth",
  tokenPath: path.join(__dirname, "tokens.json"),
  intervalSeconds: 60,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  origin: "chrome-extension://knnliglhgkmlblppdejchidfihjnockl",
};

function getTimestamp() {
  return new Date().toISOString().replace("T", " ").substr(0, 19);
}

function log(message, type = "INFO", email = "N/A") {
  console.log(`[${getTimestamp()}] [${type}] [User: ${email}] ${message}`);
}

async function getTokens() {
  try {
    if (!fs.existsSync(config.tokenPath)) {
      throw new Error(`Token file not found: ${config.tokenPath}`);
    }
    const tokensData = await fs.promises.readFile(config.tokenPath, "utf8");
    const tokens = JSON.parse(tokensData);
    if (!tokens.accessToken || tokens.accessToken.length < 20) {
      throw new Error("Invalid access token (too short or empty)");
    }
    log(`Access token loaded successfully`);
    return tokens;
  } catch (error) {
    log(`Error reading tokens: ${error.message}`, "ERROR");
    throw error;
  }
}

async function saveTokens(tokens) {
  try {
    await fs.promises.writeFile(
      config.tokenPath,
      JSON.stringify(tokens, null, 2),
      "utf8"
    );
    log("Tokens saved successfully");
    return true;
  } catch (error) {
    log(`Error saving tokens: ${error.message}`, "ERROR");
    return false;
  }
}

async function refreshTokens(refreshToken) {
  try {
    log("Refreshing access token...");
    const response = await axios.post(
      `${config.authURL}/refresh`,
      { refresh_token: refreshToken },
      { headers: { "User-Agent": config.userAgent, "Origin": config.origin } }
    );
    if (!response.data || !response.data.access_token) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }
    const tokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
    };
    log("Token refreshed successfully");
    await saveTokens(tokens);
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
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (response.status === 401) {
      log("Access token expired, refreshing token...", "WARN");
      tokens = await refreshTokens(tokens.refreshToken);
      return await getUserStats(tokens);
    }
    if (response.data && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    log(`Error fetching user stats: ${error.message}`, "ERROR");
    return null;
  }
}

async function validatePrices() {
  try {
    log("Starting validation process...");
    let tokens = await getTokens();
    const userData = await getUserStats(tokens);
    if (!userData) {
      log("Failed to fetch user stats", "ERROR");
      return;
    }
    log(`User Email: ${userData.email}`, "INFO", userData.email);
    log(`Validations: ${userData.stats.stork_signed_prices_valid_count || 0}`, "INFO");
    log(`Invalid Validations: ${userData.stats.stork_signed_prices_invalid_count || 0}`, "INFO");
  } catch (error) {
    log(`Validation process stopped: ${error.message}`, "ERROR");
  }
}

function startApp() {
  log("STORK ORACLE Validator Bot Activated");
  setInterval(validatePrices, config.intervalSeconds * 1000);
}

startApp();
