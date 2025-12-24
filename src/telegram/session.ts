import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

import { loadEnvFiles } from "@/telegram/config";

loadEnvFiles();

const apiIdValue = process.env.TELEGRAM_API_ID;
const apiHashValue = process.env.TELEGRAM_API_HASH;

if (!apiIdValue || Number.isNaN(Number(apiIdValue))) {
  throw new Error("Set TELEGRAM_API_ID in .env.local before running this script.");
}

if (!apiHashValue) {
  throw new Error("Set TELEGRAM_API_HASH in .env.local before running this script.");
}
const apiHash = apiHashValue;

const rl = readline.createInterface({ input, output });

async function ask(prompt: string, { allowEmpty = false } = {}) {
  const answer = (await rl.question(prompt)).trim();
  if (!allowEmpty && !answer) {
    return ask(prompt, { allowEmpty });
  }
  return answer;
}

async function main() {
  const apiId = Number(apiIdValue);
  const existingSession = process.env.TELEGRAM_SESSION ?? "";
  const client = new TelegramClient(
    new StringSession(existingSession),
    apiId,
    apiHash,
    {
      connectionRetries: 5,
    }
  );

  const phoneNumber = await ask("Phone number (+1234567890): ");

  await client.start({
    phoneNumber: async () => phoneNumber,
    password: async () => ask("2FA password (leave empty if none): ", { allowEmpty: true }),
    phoneCode: async () => ask("Login code: "),
    onError: (error) => {
      console.error("Login error:", error);
      throw error;
    },
  });

  console.log("Login successful.");
  console.log("Add this string to TELEGRAM_SESSION in your .env.local file:\n");
  console.log(client.session.save());

  await client.disconnect();
  rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
