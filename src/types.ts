export abstract declare class StreamQMessage {
  public offset: number;
  public value: any;
  public timestamp: number;
}

export declare interface StreamQMessageConfig {
  pollingInterval?: number;
  retentionTime?: number;
  deleteAfterReading?: boolean;
}

export declare class StreamQInstance {
  constructor(persist: StreamQPersist);
  public on(event: string, callback: (message: StreamQMessage) => Promise<void>): void;
  public resume(event: string): void;
  public pause(event: string): void;
  public emit(event: string, values: any[]): Promise<void>;
  public register(event: string, config: any): Promise<void>;
}

export declare class StreamQPersist {
  public getOffset(event: string): Promise<number>;
  public getNextOffset(event: string): Promise<number>;
  public setOffset(event: string, offset: number): Promise<void>;
  public setNextOffset(event: string, offset: number): Promise<void>;
  public getMessage(event: string, offset: number): Promise<any>;
  public addMessage(event: string, offset: number, value: any, expiresIn: number): Promise<void>;
  public removeMessage(event: string, offset: number): Promise<void>;
}