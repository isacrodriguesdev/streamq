import { ILogger, Logger } from "@isacrodriguesdev/logger";
import { StreamQInstance, StreamQMessageConfig, StreamQMessage, StreamQPersist } from "./types";

export class StreamQ implements StreamQInstance {
  private static listeners: Map<string, NodeJS.Timer> = new Map();
  private static proccessing: Map<string, boolean> = new Map();
  private static config: Map<string, StreamQMessageConfig> = new Map();
  private static onEventCallbacks: Map<string, (message: StreamQMessage) => Promise<void>> = new Map();
  private static nextOffset: Map<string, number> = new Map();
  private static offset: Map<string, number> = new Map();
  private static paused: Map<string, boolean> = new Map();
  private readonly logger: ILogger = new Logger();

  constructor(private readonly persist: StreamQPersist) {}

  public on(event: string, callback: (message: StreamQMessage) => Promise<void>): void {
    StreamQ.onEventCallbacks.set(event, callback);
  }

  public async emit(event: string, values: any[]): Promise<void> {
    let offset = StreamQ.offset.get(event);

    for (const value of values) {
      offset++;
      await this.addMessage(event, offset, value);
    }

    this.checkIfListenerShouldStart(event);
  }

  public async register(event: string, config: StreamQMessageConfig): Promise<void> {
    if (!config.retentionTime) {
      config.retentionTime = 10080; // 7 dias
    }

    if (!config.pollingInterval) {
      config.pollingInterval = 0; // 0ms
    }

    if (!config.deleteAfterReading) {
      config.deleteAfterReading = false;
    }

    StreamQ.config.set(event, config);
    await this.iniatilize(event);
  }

  public resume(event: string): void {
    if (StreamQ.paused.get(event)) {
      StreamQ.paused.set(event, false);
      this.startListener(event);
    }
  }

  public pause(event: string): void {
    if (!StreamQ.paused.get(event)) {
      StreamQ.paused.set(event, true);
      this.stopListener(event);
    }
  }

  private checkIfListenerShouldStart(event: string) {
    const listener = StreamQ.listeners.get(event);
    const paused = StreamQ.paused.get(event);

    if (!listener && paused === false) {
      this.startListener(event);
    }
  }

  private async nextProcess(event: string): Promise<void> {
    this.setProcessing(event, true);

    let nextOffset = this.getNextOffset(event);
    let offset = this.getOffset(event);

    if (nextOffset <= offset) {
      const message = await this.persist.getMessage(event, nextOffset);

      if (!message) {
        await this.setNext(event);
        this.setProcessing(event, false);
        return;
      }

      const callback = StreamQ.onEventCallbacks.get(event);
      if (callback) {
        await callback(message);
      }

      const config = StreamQ.config.get(event);

      if (config.deleteAfterReading) {
        this.persist.removeMessage(event, nextOffset);
      }

      await this.setNext(event);
      this.setProcessing(event, false);
    } else {
      this.stopListener(event);
      this.setProcessing(event, false);
    }
  }

  private async addMessage(event: string, offset: number, value: any): Promise<void> {
    const config = StreamQ.config.get(event);
    StreamQ.offset.set(event, offset);
    await this.persist.addMessage(
      event,
      offset,
      typeof value === "object" ? JSON.stringify(value) : value,
      config.retentionTime
    );
    await this.persist.setOffset(event, offset);
  }

  private setProcessing(event: string, processing: boolean): void {
    StreamQ.proccessing.set(event, processing);
  }

  private async setNext(event: string): Promise<void> {
    const nextOffset = StreamQ.nextOffset.get(event) + 1;
    await this.persist.setNextOffset(event, nextOffset);
    StreamQ.nextOffset.set(event, nextOffset);
  }

  private getNextOffset(event: string): number {
    return StreamQ.nextOffset.get(event);
  }

  private getOffset(event: string): number {
    return StreamQ.offset.get(event);
  }

  private startListener(event: string): void {
    const config = StreamQ.config.get(event);
    const intervalId = setInterval(() => {
      const processing = StreamQ.proccessing.get(event);
      if (!processing) {
        this.nextProcess(event);
      }
    }, config.pollingInterval);

    StreamQ.listeners.set(event, intervalId);
  }

  private stopListener(event: string): void {
    const intervalId = StreamQ.listeners.get(event);
    if (intervalId) {
      clearInterval(intervalId);
      StreamQ.listeners.delete(event);
    }
  }

  private async iniatilize(event: string): Promise<void> {
    StreamQ.paused.set(event, false);

    const nextOffset = await this.persist.getNextOffset(event);
    const offset = await this.persist.getOffset(event);

    StreamQ.nextOffset.set(event, nextOffset);
    StreamQ.offset.set(event, offset);

    if (nextOffset <= offset) {
      this.startListener(event);
    }
  }
}
