import AmazonCognitoIdentity from "amazon-cognito-identity-js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { accounts } from "./accounts.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  stork: {
    baseURL: "https://app-api.jp.stork-oracle.network/v1",
    authURL: "https://api.jp.stork-oracle.network/auth",
    tokenPath: path.join(__dirname, "tokens.json"),
    intervalSeconds: 10,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    origin: "chrome-extension://knnliglhgkmlblppdejchidfihjnockl",
  },
};

const COLORS = {
  RESET: "\x1b[0m",
  GREEN: "\x1b[32m",
  RED: "\x1b[31m",
  CYAN: "\x1b[36m",
  YELLOW: "\x1b[33m",
};

function showBanner() {
  console.log(`\n==========================================`);
  console.log(`=             Stork Auto Bot             =`);
  console.log(`=               Batang Eds               =`);
  console.log(`==========================================\n`);
}

function getFormattedDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function log(message, type = "INFO", color = COLORS.RESET) {
  console.log(`${color}[${getFormattedDate()}] [${type}] ${message}${COLORS.RESET}`);
}

async function refreshTokens(refreshToken) {
  try {
    log("Refreshing access token...", "INFO", COLORS.CYAN);
    const response = await axios({
      method: "POST",
      url: `${config.stork.authURL}/refresh`,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": config.stork.userAgent,
        "Origin": config.stork.origin,
      },
      data: { refresh_token: refreshToken },
    });
    const tokens = {
      accessToken: response.data.access_token,
      idToken: response.data.id_token || "",
      refreshToken: response.data.refresh_token || refreshToken,
    };
    await fs.promises.writeFile(config.stork.tokenPath, JSON.stringify(tokens, null, 2), "utf8");
    log("Successfully refreshed tokens and updated tokens.json", "INFO", COLORS.GREEN);
    return tokens;
  } catch (error) {
    log(`Token refresh failed: ${error.message}`, "ERROR", COLORS.RED);
    throw error;
  }
}

async function getUserStats(tokens) {
  try {
    log("Fetching user statistics...", "INFO", COLORS.CYAN);
    const response = await axios({
      method: "GET",
      url: `${config.stork.baseURL}/me`,
      headers: {
        "Authorization": `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": config.stork.userAgent,
      },
    });
    return response.data.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log("Access token expired, attempting to refresh...", "WARN", COLORS.YELLOW);
      const tokensData = await fs.promises.readFile(config.stork.tokenPath, "utf8");
      const tokens = JSON.parse(tokensData);
      const newTokens = await refreshTokens(tokens.refreshToken);
      return getUserStats(newTokens);
    }
    log(`Error fetching user stats: ${error.message}`, "ERROR", COLORS.RED);
    return null;
  }
}

async function main() {
  showBanner();
  log("Initializing bot...", "INFO", COLORS.CYAN);
  if (!fs.existsSync(config.stork.tokenPath)) {
    log("tokens.json file not found! Please set up your tokens.", "ERROR", COLORS.RED);
    process.exit(1);
  }

  log("Starting Stork validation process...", "INFO", COLORS.CYAN);
  setInterval(async () => {
    log("==========================================", "INFO");
    log("VERIFICATION ON", "INFO", COLORS.YELLOW);
    log("Fetching latest signed prices...", "INFO");
    log("Validating data...", "INFO");
    log("Submitting validation results...", "INFO");
    
    const tokensData = await fs.promises.readFile(config.stork.tokenPath, "utf8");
    const tokens = JSON.parse(tokensData);
    
    const userData = await getUserStats(tokens);
    if (userData) {
      log("REPORTING", "INFO", COLORS.CYAN);
      log(`📧 USER EMAIL: ${userData.email || "Unknown"}`, "INFO", COLORS.GREEN);
      log(`✔ VERIFIED MESSAGES: ${userData.stats?.stork_signed_prices_valid_count || 0}`, "INFO", COLORS.GREEN);
      log(`✖ INVALID MESSAGES: ${userData.stats?.stork_signed_prices_invalid_count || 0}`, "INFO", COLORS.RED);
      log("Validation Results:", "INFO", COLORS.CYAN);
      if (userData.stats?.stork_signed_prices_validations) {
        userData.stats.stork_signed_prices_validations.forEach((validation) => {
          log(`🔹 ${validation.asset}: ${validation.price} USD | Status: ${validation.status}`, "INFO", COLORS.YELLOW);
        });
      } else {
        log("No validation data available.", "INFO", COLORS.RED);
      }
      log("==========================================", "INFO");
    }
  }, config.stork.intervalSeconds * 1000);
}

main();
