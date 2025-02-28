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
  maxRetries: 3,
};

function getFormattedDate() {
  return new Date().toISOString().replace("T", " ").substr(0, 19);
}

function log(message, type = "INFO") {
  console.log(`[${getFormattedDate()}] [${type}] ${message}`);
}

async function fetchWithRetry(url, options, retries = config.maxRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios(url, options);
      return response;
    } catch (error) {
      if (i < retries - 1) {
        log(`Retrying request (${i + 1}/${retries}) due to error: ${error.message}`, "WARN");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }
}

async function refreshToken() {
  try {
    log("Refreshing access token...");
    if (!fs.existsSync(config.tokenPath)) throw new Error("Token file not found");
    
    const tokensData = await fs.promises.readFile(config.tokenPath, "utf8");
    const tokens = JSON.parse(tokensData);
    
    if (!tokens.refreshToken) throw new Error("No refresh token found");

    const response = await axios.post(config.authURL, { refreshToken: tokens.refreshToken }, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": config.userAgent,
      },
    });
    
    tokens.accessToken = response.data.accessToken;
    await fs.promises.writeFile(config.tokenPath, JSON.stringify(tokens, null, 2));
    log("Access token refreshed successfully.");
    return tokens.accessToken;
  } catch (error) {
    log(`Error refreshing token: ${error.message}`, "ERROR");
    return null;
  }
}

async function getTokensAndStats() {
  try {
    log("Reading token file...");
    if (!fs.existsSync(config.tokenPath)) throw new Error("Token file not found");
    
    const tokensData = await fs.promises.readFile(config.tokenPath, "utf8");
    let tokens = JSON.parse(tokensData);
    
    if (!tokens.accessToken || tokens.accessToken.length < 20) {
      log("Invalid or expired access token. Attempting to refresh...");
      tokens.accessToken = await refreshToken();
      if (!tokens.accessToken) throw new Error("Failed to refresh access token");
    }

    log("Fetching user stats...");
    const response = await fetchWithRetry(`${config.baseURL}/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": config.userAgent,
      },
    });
    if (response.status !== 200) throw new Error(`API response status: ${response.status}`);

    return { tokens, userData: response.data.data };
  } catch (error) {
    log(`Error fetching user stats: ${error.message}`, "ERROR");
    return { tokens: null, userData: null };
  }
}

async function runValidationProcess() {
  try {
    log("----- Starting Validation Process -----");
    let { tokens, userData } = await getTokensAndStats();
    if (!tokens) throw new Error("Failed to retrieve tokens");
    
    if (userData) {
      log(`User Email: ${userData.email || "Unknown"}`);
      log(`Total Validations: ${userData.stats?.stork_signed_prices_valid_count || 0}`);
    }

    log("Fetching signed price data...");
    const validationData = await fetchWithRetry(`${config.baseURL}/stork_signed_prices`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": config.userAgent,
      },
    });
    
    if (!validationData.data || Object.keys(validationData.data).length === 0) {
      log("No validation data available.", "WARN");
    } else {
      log(`Processing ${Object.keys(validationData.data).length} validation(s)...`);
      for (const assetKey in validationData.data) {
        log(`Validating: ${assetKey} | Price: ${validationData.data[assetKey].price || "N/A"}`);
      }
    }

    log(`Next validation in ${config.intervalSeconds} seconds...`);
    for (let i = config.intervalSeconds; i > 0; i--) {
      process.stdout.write(`\rWaiting: ${i}s `);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("");
  } catch (error) {
    log(`Validation process stopped: ${error.message}`, "ERROR");
  }
}

async function startApp() {
  log("STORK ORACLE Validator Bot Activated");
  log(`Interval: ${config.intervalSeconds} seconds`);
  log(`Token Path: ${config.tokenPath}`);
  log("Auto-refresh: Enabled");
  runValidationProcess();
  setInterval(runValidationProcess, config.intervalSeconds * 1000);
}

startApp();
