import fs from "node:fs";
import path from "node:path";

import { config as loadEnv } from "dotenv";

export type TelegramRelayConfig = {
  apiId: number;
  apiHash: string;
  session: string;
  sourceChatId: string;
  targetChatId: string;
  /** Number of historical messages to copy on start. `undefined` means copy everything. */
  historyLimit?: number;
};

let envLoaded = false;
let cachedConfig: TelegramRelayConfig | null = null;

export function loadEnvFiles() {
  if (envLoaded) {
    return;
  }

  const rootDir = process.cwd();
  const envPath = path.join(rootDir, ".env");
  const localEnvPath = path.join(rootDir, ".env.local");

  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath });
  }

  if (fs.existsSync(localEnvPath)) {
    loadEnv({ path: localEnvPath, override: true });
  }

  envLoaded = true;
}

function readNumberEnv(key: string): number {
  const value = process.env[key];
  if (!value || Number.isNaN(Number(value))) {
    throw new Error(`Missing or invalid ${key}`);
  }

  return Number(value);
}

export function getRelayConfig(): TelegramRelayConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  loadEnvFiles();

  const apiId = readNumberEnv("TELEGRAM_API_ID");
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_SESSION;
  const sourceChatId = process.env.TELEGRAM_SOURCE_CHAT_ID;
  const targetChatId = process.env.TELEGRAM_TARGET_CHAT_ID;

  if (!apiHash) {
    throw new Error("Missing TELEGRAM_API_HASH");
  }

  if (!session) {
    throw new Error(
      "Missing TELEGRAM_SESSION. Run `npm run telegram:login` to generate one."
    );
  }

  if (!sourceChatId) {
    throw new Error("Missing TELEGRAM_SOURCE_CHAT_ID");
  }

  if (!targetChatId) {
    throw new Error("Missing TELEGRAM_TARGET_CHAT_ID");
  }

  const rawHistory = process.env.TELEGRAM_HISTORY_LIMIT;
  let historyLimit: number | undefined;

  if (rawHistory !== undefined && rawHistory !== "") {
    const parsed = Number(rawHistory);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new Error("TELEGRAM_HISTORY_LIMIT must be a positive number or 0");
    }
    historyLimit = parsed;
  }

  cachedConfig = {
    apiId,
    apiHash,
    session,
    sourceChatId,
    targetChatId,
    historyLimit,
  };

  return cachedConfig;
}
