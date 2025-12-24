import { Api, TelegramClient } from "telegram";
import { NewMessage, NewMessageEvent } from "telegram/events";
import type { EntityLike } from "telegram/define";
import { StringSession } from "telegram/sessions";

import { getRelayConfig } from "@/telegram/config";
import {
  getLastProcessedMessageId,
  stateFilePath,
  updateLastProcessedMessageId,
} from "@/telegram/state";

type RelayContext = {
  client: TelegramClient;
  source: EntityLike;
  target: EntityLike;
  sourceChatId: string;
};

function getStringProperty(value: unknown, key: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    key in value &&
    typeof (value as Record<string, unknown>)[key] === "string"
  ) {
    return (value as Record<string, string>)[key];
  }

  return undefined;
}

async function forwardMessageId(
  { client, source, target, sourceChatId }: RelayContext,
  messageId: number
) {
  await client.forwardMessages(target, {
    messages: [messageId],
    fromPeer: source,
  });

  updateLastProcessedMessageId(sourceChatId, messageId);
}

async function copyHistoricalMessages(
  context: RelayContext,
  limit: number | undefined
): Promise<number> {
  if (limit === 0) {
    console.log("Skipping backlog copy because TELEGRAM_HISTORY_LIMIT=0.");
    return getLastProcessedMessageId(context.sourceChatId);
  }

  const iterator = context.client.iterMessages(context.source, {
    reverse: true,
    minId: getLastProcessedMessageId(context.sourceChatId),
  });

  let processed = 0;
  let lastMessageId = getLastProcessedMessageId(context.sourceChatId);
  const targetCount = limit ?? Infinity;

  for await (const message of iterator) {
    if (!(message instanceof Api.Message)) {
      continue;
    }

    if (message.id <= lastMessageId) {
      continue;
    }

    await forwardMessageId(context, message.id);
    lastMessageId = message.id;
    processed += 1;

    console.log(`Forwarded historical message ${message.id}`);

    if (processed >= targetCount) {
      break;
    }
  }

  if (processed === 0) {
    console.log("No historical messages needed forwarding.");
  } else {
    console.log(`Forwarded ${processed} historical messages.`);
  }

  return lastMessageId;
}

async function main() {
  const config = getRelayConfig();
  const client = new TelegramClient(
    new StringSession(config.session),
    config.apiId,
    config.apiHash,
    { connectionRetries: 5 }
  );

  await client.connect();

  if (!(await client.checkAuthorization())) {
    throw new Error("Session is not authorized. Run `npm run telegram:login` first.");
  }

  const me = await client.getMe();
  const username = getStringProperty(me, "username");
  const firstName = getStringProperty(me, "firstName");
  console.log(`Connected as ${username ?? firstName ?? "user"}.`);

  const source = await client.getInputEntity(config.sourceChatId);
  const target = await client.getInputEntity(config.targetChatId);

  const context: RelayContext = {
    client,
    source,
    target,
    sourceChatId: config.sourceChatId,
  };

  console.log(
    `Relaying from ${context.sourceChatId} -> ${config.targetChatId} (state: ${stateFilePath()}).`
  );

  await copyHistoricalMessages(context, config.historyLimit);

  const handler = async (event: NewMessageEvent) => {
    const message = event.message;

    if (!(message instanceof Api.Message)) {
      return;
    }

    const last = getLastProcessedMessageId(context.sourceChatId);
    if (message.id <= last) {
      return;
    }

    try {
      await forwardMessageId(context, message.id);
      console.log(`Forwarded live message ${message.id}`);
    } catch (error) {
      console.error("Failed to forward live message:", error);
    }
  };

  client.addEventHandler(
    handler,
    new NewMessage({
      chats: [source],
      incoming: true,
    })
  );

  console.log("Relay is running. Press Ctrl+C to stop.");

  const cleanup = async () => {
    console.log("Disconnecting from Telegram...");
    client.removeEventHandler(handler);
    await client.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
