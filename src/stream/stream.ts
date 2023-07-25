import { io, Socket } from "socket.io-client";
import { SqlitePersist } from "../persist/sqlite/sqlite";

export class Stream {
  private static listener: Map<string, NodeJS.Timer> = new Map();
  private static reading: Map<string, boolean> = new Map();
  private static config: Map<string, any> = new Map();
  private static onEventCallback: Map<string, (message: any) => Promise<void>> = new Map();
  private static connection: Map<string, Socket> = new Map();
  private static nextOffset: Map<string, number> = new Map();
  private static offset: Map<string, number> = new Map();
  private persist = new SqlitePersist();

  constructor(brokers: string[]) {
    for (const broker of brokers) {
      const socket = io(broker);
      socket.on("connect", () => {
        console.log("Conectado ao servidor Socket.IO");
      });
      socket.on("disconnect", () => {
        console.log("Desconectado do servidor Socket.IO");
      });
      Stream.connection.set(broker, socket);
    }
  }

  public on(event: string, callback: (message: any) => Promise<void>): void {
    Stream.onEventCallback.set(event, callback);
  }

  private startListener(event: string): void {
    if (!Stream.listener.get(event)) {
      const config = Stream.config.get(event);

      const intervalId = setInterval(() => {
        const processing = Stream.reading.get(event);
        if (!processing) {
          this.nextProcess(event);
        }
      }, config.pollingInterval);

      Stream.listener.set(event, intervalId);
    }
  }

  private stopListener(event: string): void {
    const intervalId = Stream.listener.get(event);
    if (intervalId) {
      clearInterval(intervalId);
      Stream.listener.delete(event);
    }
  }

  private async shouldStartListener(event: string): Promise<boolean> {
    const nextId = await this.persist.getNextOffset(event);
    const offset = await this.persist.getOffset(event);

    return nextId <= offset;
  }

  private async startListenerIfNecessary(event: string): Promise<void> {
    const shouldStart = await this.shouldStartListener(event);
    if (shouldStart) {
      this.startListener(event);
    }
  }

  private async nextProcess(event: string): Promise<void> {
    Stream.reading.set(event, true);

    const nextId = await this.persist.getNextOffset(event);
    const offset = await this.persist.getOffset(event);

    if (nextId <= offset) {
      const callback = Stream.onEventCallback.get(event);

      console.log("Próximo processamento", nextId + 1);

      const message = await this.persist.getMessage(event, nextId);
      if (!message) {
        await this.persist.updateNextOffset(event, nextId + 1);
        Stream.reading.set(event, false);
        return;
      }

      if (callback) {
        await callback(message);
      }

      await this.persist.updateNextOffset(event, nextId + 1);
    } else {
      this.stopListener(event);
    }

    Stream.reading.set(event, false);
  }

  private async addMessage(event: string, value: any): Promise<void> {
    const offset = await this.persist.getOffset(event);
    console.log("Adicionando mensagem", offset + 1);
    await this.persist.saveMessage(event, value, offset + 1);
  }

  public register(event: string, config: any): void {
    Stream.config.set(event, config);
    Stream.reading.set(event, false);
    const sockets = Stream.connection.values();

    for (const socket of sockets) {
      socket.on(event, async (values) => {
        for (const value of values) {
          await this.addMessage(event, value);
        }
        this.startListener(event);
      });
    }
    this.startListenerIfNecessary(event);
  }
}
