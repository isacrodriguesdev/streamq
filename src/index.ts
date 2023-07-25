import { Logger } from "@isacrodriguesdev/logger";
import { Sender } from "./sender/sender";
import { Stream } from "./stream/stream";
import { SqlitePersist } from "./persist/sqlite/sqlite";

const event = "message1";

const logger = new Logger();

const sender = new Sender(4001);

const stream = new Stream(["http://localhost:4001"]);
stream.register(event, { pollingInterval: 2000 });

stream.on(event, async (message) => {
  // logger.notify(["console"], { level: "info", message: "Message received", additionalInfo: message });
});

// const persist = new SqlitePersist();

// persist.getNextOffset(event).then((messages) => {
//   console.log(messages);
// });

setInterval(() => {
  sender.send(event, [new Date().toISOString()]);
}, 2000);
