export declare interface MessageQ {
  offset: number;
  value: any;
}

export declare interface IEventConfig {
  delayBetweenUpdates: number;
}

export declare class IStreamQ {
  constructor(persist: IPersist);
  public onEvent(eventName: string, callback: (message: MessageQ) => Promise<void>): void;
  public emit(eventName: string, values: any[]): Promise<void>;
  public register(eventName: string, config: any): Promise<void>;
}

export declare class IPersist {
  public createOffsetsIfNotExists(eventName: string): Promise<void>;
  public getCurrentOffset(eventName: string): Promise<number>;
  public getNextOffset(eventName: string): Promise<number>;
  public setCurrentOffset(eventName: string, offset: number): Promise<void>;
  public setNextOffset(eventName: string, offset: number): Promise<void>;
  public getMessage(eventName: string, offset: number): Promise<any>;
  public addMessage(eventName: string, offset: number, value: any): Promise<void>;
  public removeMessage(eventName: string, offset: number): Promise<void>;
}