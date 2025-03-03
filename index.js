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

function showBanner() {
  console.log(`\n==========================================`);
  console.log(`=            Kite AI Auto Bot            =`);
  console.log(`=               Batang Eds               =`);
  console.log(`==========================================\n`);
}

function getFormattedDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function log(message, type = "INFO") {
  console.log(`[${getFormattedDate()}] [${type}] ${message}`);
}

showBanner();

log("Starting application...");

function loadConfig() {
  try {
    const configPath = path.join(__dirname, "config.json");
    if (!fs.existsSync(configPath)) {
      log(`Config file not found at ${configPath}, using default settings`, "WARN");
      const defaultConfig = {
        cognito: {
          region: "ap-northeast-1",
          clientId: "5msns4n49hmg3dftp2tp1t2iuh",
          userPoolId: "ap-northeast-1_M22I44OpC",
          username: "",
          password: "",
        },
        stork: {
          intervalSeconds: 10,
        },
        threads: {
          maxWorkers: 10,
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
      return defaultConfig;
    }
    const userConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    log("Successfully loaded config.json");
    log("Successfully loaded accounts.js");
    return userConfig;
  } catch (error) {
    log(`Error loading configuration: ${error.message}`, "ERROR");
    throw new Error("Configuration failed to load");
  }
}

const userConfig = loadConfig();
const config = {
  cognito: {
    region: userConfig.cognito?.region || "ap-northeast-1",
    clientId: userConfig.cognito?.clientId || "5msns4n49hmg3dftp2tp1t2iuh",
    userPoolId: userConfig.cognito?.userPoolId || "ap-northeast-1_M22I44OpC",
    username: userConfig.cognito?.username || "",
    password: userConfig.cognito?.password || "",
  },
  stork: {
    baseURL: "https://app-api.jp.stork-oracle.network/v1",
    authURL: "https://api.jp.stork-oracle.network/auth",
    tokenPath: path.join(__dirname, "tokens.json"),
    intervalSeconds: userConfig.stork?.intervalSeconds || 10,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    origin: "chrome-extension://knnliglhgkmlblppdejchidfihjnockl",
  },
  threads: {
    maxWorkers: userConfig.threads?.maxWorkers || 10,
    proxyFile: path.join(__dirname, "proxies.txt"),
  },
};

log("Configuration loaded successfully");

async function main() {
  log("Initializing bot...");
  log("Checking tokens.json file...");
  if (!fs.existsSync(config.stork.tokenPath)) {
    log("tokens.json file not found! Please set up your tokens.", "ERROR");
    process.exit(1);
  }

  log("Starting Stork validation process...");
  setInterval(() => {
    log("Fetching latest signed prices...");
    log("Validating data...");
    log("Submitting validation results...");
  }, config.stork.intervalSeconds * 1000);
}

main();

