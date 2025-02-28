const fs = require("fs");
const axios = require("axios");
const path = require("path");

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

async function saveTokens(tokens) {
  try {
    await fs.promises.writeFile(config.tokenPath, JSON.stringify(tokens, null, 2), "utf8");
    log("Tokens saved successfully");
    return true;
  } catch (error) {
    log(`Error saving token: ${error.message}`, "ERROR");
    return false;
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
      refreshToken: response.data.refresh_token || refreshToken,
      isAuthenticated: true,
      isVerifying: false,
    };
    
    log("Token refreshed successfully");
    await saveTokens(tokens);
    return tokens;
  } catch (error) {
    log(`Token refresh failed: ${error.message}`, "ERROR");
    throw error;
  }
}

async function getSignedPrices(tokens) {
  try {
    log("Fetching signed price data...");
    const response = await axios.get(`${config.baseURL}/stork_signed_prices`, {
      headers: {
        "Authorization": `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": config.userAgent,
        "Origin": config.origin,
      },
    });
    
    if (response.status !== 200) {
      log(`API response status: ${response.status}`, "WARN");
      return [];
    }
    
    const data = response.data.data;
    if (!data) {
      log("Invalid response format", "WARN");
      return [];
    }
    
    return Object.keys(data).map(assetKey => ({
      asset: assetKey,
      msg_hash: data[assetKey].timestamped_signature.msg_hash,
      price: data[assetKey].price,
      timestamp: new Date(data[assetKey].timestamped_signature.timestamp / 1000000).toISOString(),
    }));
  } catch (error) {
    log(`Error fetching signed prices: ${error.message}`, "ERROR");
    throw error;
  }
}

function validatePrice(priceData) {
  log(`Validating data: ${priceData.asset || "Unknown asset"}`);
  if (!priceData.msg_hash || !priceData.price || !priceData.timestamp) {
    log("Incomplete data, considered invalid", "WARN");
    return false;
  }
  return true;
}

async function runValidationProcess() {
  try {
    log("----- Starting Validation Process -----");
    const tokens = await getTokens();
    
    const signedPrices = await getSignedPrices(tokens);
    if (signedPrices.length === 0) {
      log("No data to validate");
      return;
    }
    
    log(`Processing ${signedPrices.length} data points...`);
    for (const price of signedPrices) {
      const isValid = validatePrice(price);
      log(`Validation result for ${price.asset}: ${isValid ? "Valid" : "Invalid"}`);
    }
  } catch (error) {
    log(`Validation process stopped: ${error.message}`, "ERROR");
  }
}

function startApp() {
  log(`===========================================`);
  log(`STORK ORACLE Validator Bot Activated`);
  log(`Interval: ${config.intervalSeconds} seconds`);
  log(`Token Path: ${config.tokenPath}`);
  log(`Auto-refresh: Enabled`);
  log(`===========================================`);
  
  runValidationProcess();
  setInterval(runValidationProcess, config.intervalSeconds * 1000);
}

startApp();
