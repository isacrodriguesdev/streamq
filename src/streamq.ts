import { MessageQ, IEventConfig, IPersist, IStreamQ } from "../src/types";

export class StreamQ implements IStreamQ {
  private static listeners: Map<string, NodeJS.Timer> = new Map();
  private static proccessing: Map<string, boolean> = new Map();
  private static config: Map<string, IEventConfig> = new Map();
  private static onEventCallbacks: Map<string, (message: MessageQ) => Promise<void>> = new Map();
  private static nextOffset: Map<string, number> = new Map();
  private static currentOffset: Map<string, number> = new Map();

  constructor(private readonly persist: IPersist) {}

  public onEvent(eventName: string, callback: (message: MessageQ) => Promise<void>): void {
    StreamQ.onEventCallbacks.set(eventName, callback);
  }

  public async emit(eventName: string, values: any[]): Promise<void> {
    let currentOffset = StreamQ.currentOffset.get(eventName);

    for (const value of values) {
      currentOffset++;
      StreamQ.currentOffset.set(eventName, currentOffset);
      await this.persist.addMessage(
        eventName,
        currentOffset,
        typeof value === "object" ? JSON.stringify(value) : value
      );
    }

    const listener = StreamQ.listeners.get(eventName);
    if (!listener) {
      this.startListener(eventName);
    }
  }

  public async register(eventName: string, eventConfig: IEventConfig): Promise<void> {
    StreamQ.config.set(eventName, eventConfig);

    await this.persist.createOffsetsIfNotExists(eventName);
    this.iniatilize(eventName);
  }

  private startListener(eventName: string): void {
    const config = StreamQ.config.get(eventName);

    const intervalId = setInterval(() => {
      const processing = StreamQ.proccessing.get(eventName);
      if (!processing) {
        this.nextProcess(eventName);
      }
    }, config.delayBetweenUpdates);

    StreamQ.listeners.set(eventName, intervalId);
  }

  private stopListener(eventName: string): void {
    const intervalId = StreamQ.listeners.get(eventName);
    if (intervalId) {
      clearInterval(intervalId);
      StreamQ.listeners.delete(eventName);
    }
  }

  private async nextProcess(eventName: string): Promise<void> {
    this.setProcessing(eventName, true);

    let nextOffset = this.getNextOffset(eventName);
    let currentOffset = this.getCurrentOffset(eventName);

    if (nextOffset <= currentOffset) {
      const message = await this.persist.getMessage(eventName, nextOffset);

      if (!message) {
        await this.setNext(eventName);
        this.setProcessing(eventName, false);
        return;
      }

      const callback = StreamQ.onEventCallbacks.get(eventName);
      if (callback) {
        await callback(message);
      }

      await this.persist.removeMessage(eventName, nextOffset);
      await this.setNext(eventName);
      this.setProcessing(eventName, false);
    } else {
      this.stopListener(eventName);
      this.setProcessing(eventName, false);
    }
  }

  private setProcessing(eventName: string, processing: boolean): void {
    StreamQ.proccessing.set(eventName, processing);
  }

  private async setNext(eventName: string): Promise<void> {
    const nextOffset = StreamQ.nextOffset.get(eventName) + 1;
    await this.persist.setNextOffset(eventName, nextOffset);
    StreamQ.nextOffset.set(eventName, nextOffset);
  }

  private getNextOffset(eventName: string): number {
    return StreamQ.nextOffset.get(eventName);
  }

  private getCurrentOffset(eventName: string): number {
    return StreamQ.currentOffset.get(eventName);
  }

  private async iniatilize(eventName: string): Promise<void> {
    const nextOffset = await this.persist.getNextOffset(eventName);
    const currentOffset = await this.persist.getCurrentOffset(eventName);

    StreamQ.nextOffset.set(eventName, nextOffset);
    StreamQ.currentOffset.set(eventName, currentOffset);

    if (nextOffset <= currentOffset) {
      this.startListener(eventName);
    }
  }
}
