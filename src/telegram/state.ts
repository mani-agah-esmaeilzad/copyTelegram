import fs from "node:fs";
import path from "node:path";

type RelayState = Record<string, { lastMessageId: number }>;

const STATE_PATH = path.resolve(process.cwd(), ".telegram-relay-state.json");

function readState(): RelayState {
  if (!fs.existsSync(STATE_PATH)) {
    return {};
  }

  try {
    const content = fs.readFileSync(STATE_PATH, "utf-8");
    return JSON.parse(content) as RelayState;
  } catch {
    console.warn(
      "Failed to parse .telegram-relay-state.json, starting with a clean slate."
    );
    return {};
  }
}

function writeState(state: RelayState) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function getLastProcessedMessageId(sourceChatId: string): number {
  const state = readState();
  return state[sourceChatId]?.lastMessageId ?? 0;
}

export function updateLastProcessedMessageId(
  sourceChatId: string,
  messageId: number
) {
  const state = readState();
  const current = state[sourceChatId]?.lastMessageId ?? 0;

  if (messageId <= current) {
    return;
  }

  state[sourceChatId] = { lastMessageId: messageId };
  writeState(state);
}

export function stateFilePath() {
  return STATE_PATH;
}
