import AmazonCognitoIdentity from "amazon-cognito-identity-js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  stork: {
    baseURL: "https://app-api.jp.stork-oracle.network/v1",
    authURL: "https://api.jp.stork-oracle.network/auth",
    tokenPath: path.join(__dirname, "tokens.json"),
    intervalSeconds: 10,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    origin: "chrome-extension://knnliglhgkmlblppdejchidfihjnockl",
  },
};

function showBanner() {
  console.log("\n==========================================");
  console.log("=             Stork Auto Bot             =");
  console.log("=               Batang Eds               =");
  console.log("==========================================\n");
}

function log(message, type = "INFO") {
  const color = {
    INFO: "\x1b[32m", // Green
    WARN: "\x1b[33m", // Yellow
    ERROR: "\x1b[31m", // Red
  };
  console.log(`${color[type]}[${new Date().toISOString()}] [${type}] ${message}\x1b[0m`);
}

async function getUserStats(tokens) {
  try {
    log("Fetching user statistics...");
    const response = await axios.get(`${config.stork.baseURL}/me`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "User-Agent": config.stork.userAgent,
      },
    });
    return response.data.data;
  } catch (error) {
    log(`Error fetching user stats: ${error.message}`, "ERROR");
    return null;
  }
}

async function submitValidation(tokens, validationData) {
  try {
    log("Submitting validation results...", "INFO");
    log(`Validation Data: ${JSON.stringify(validationData, null, 2)}`, "INFO");
    const response = await axios.post(
      `${config.stork.baseURL}/stork_signed_prices/validations`,
      validationData,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "User-Agent": config.stork.userAgent,
          "Content-Type": "application/json",
        },
      }
    );
    log(`Validation Response: ${JSON.stringify(response.data, null, 2)}`, "INFO");
  } catch (error) {
    log(`Validation Error: ${error.message}`, "ERROR");
  }
}

async function main() {
  showBanner();
  log("Initializing bot...");
  if (!fs.existsSync(config.stork.tokenPath)) {
    log("tokens.json file not found!", "ERROR");
    process.exit(1);
  }

  setInterval(async () => {
    log("Fetching user statistics...");
    const tokensData = await fs.promises.readFile(config.stork.tokenPath, "utf8");
    const tokens = JSON.parse(tokensData);
    const userData = await getUserStats(tokens);
    if (userData) {
      log(`📧 USER EMAIL: ${userData.email}`);
      log(`✔ VERIFIED MESSAGES: ${userData.stats.stork_signed_prices_valid_count || 0}`);
      log(`✖ INVALID MESSAGES: ${userData.stats.stork_signed_prices_invalid_count || 0}`);
      await submitValidation(tokens, { msg_hash: "test", valid: true });
    }
  }, config.stork.intervalSeconds * 1000);
}

main();
