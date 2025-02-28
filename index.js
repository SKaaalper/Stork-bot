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

async function runValidationProcess() {
  try {
    log("----- Starting Validation Process -----");
    let tokens = await getTokens();
    const userData = await getUserStats(tokens);
    if (userData) {
      log(`User Email: ${userData.email || "Unknown"}`);
      log(`Total Validations: ${userData.stats.stork_signed_prices_valid_count || 0}`);
    }

    log("Fetching signed price data...");
    const validationData = await getSignedPrices(tokens);
    if (!validationData || validationData.length === 0) {
      log("No validation data available.", "WARN");
    } else {
      log(`Processing ${validationData.length} validation(s)...`);
      for (const data of validationData) {
        log(`Validating: ${data.asset} | Price: ${data.price} | Timestamp: ${data.timestamp}`);
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
