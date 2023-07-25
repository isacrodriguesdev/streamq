import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import schedule from "node-schedule";
import { Logger } from "@isacrodriguesdev/logger";

export class SqlitePersist {
  private db: Database;
  private initialized: boolean = false;
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger();
    // this.scheduleExpiredMessageDeletion();
  }

  private async initialize(): Promise<void> {
    try {
      this.db = await open({
        filename: "streamq.db",
        driver: sqlite3.Database,
      });

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          offset INTEGER,
          event TEXT,
          value TEXT,
          timestamp INTEGER,
          expiration_date INTEGER
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS next_offset (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event TEXT,
          value INTEGER
        )
      `);

      this.initialized = true;
    } catch (error) {
      this.logger.notify(["console"], {
        level: "error",
        message: "Error initializing SQLite database",
        additionalInfo: { error: error.toString() },
      });
    }
  }

  private async isInitialized(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.initialized;
  }

  public async saveMessage(event: string, value: string, offset: number): Promise<void> {
    await this.isInitialized();
    try {
      const expirationDate = Date.now() + 5000;
      await this.db.run(
        "INSERT INTO messages (offset, event, value, timestamp, expiration_date) VALUES (?, ?, ?, ?, ?)",
        [offset, event, typeof value === "object" ? JSON.stringify(value) : value, Date.now(), expirationDate]
      );
    } catch (error) {
      this.logger.notify(["console"], {
        level: "error",
        message: "Error saving message to SQLite database",
        additionalInfo: { error: error.toString() },
      });
    }
  }

  public async getMessage(event: string, offset: number): Promise<any | null> {
    await this.isInitialized();
    try {
      const result = await this.db.get("SELECT * FROM messages WHERE event = ? AND offset = ?", [
        event,
        offset,
      ]);
      return result;
    } catch (error) {
      this.logger.notify(["console"], {
        level: "error",
        message: "Error getting message from SQLite database",
        additionalInfo: { error: error.toString() },
      });
      return null;
    }
  }

  public async getNextOffset(event: string): Promise<number | null> {
    await this.isInitialized();
    try {
      const result = await this.db.get("SELECT * FROM next_offset WHERE event = ?", [event]);
      if (!result) {
        await this.db.run("INSERT INTO next_offset (value, event) VALUES (?, ?)", [1, event]);
        return 1;
      }
      return result.id;
    } catch (error) {
      this.logger.notify(["console"], {
        level: "error",
        message: "Error getting next ID from SQLite database",
        additionalInfo: { error: error.toString() },
      });
      return null;
    }
  }

  public async updateNextOffset(event: string, offset: number): Promise<void> {
    await this.isInitialized();
    try {
      await this.db.run("UPDATE next_offset SET value = ? WHERE event = ?", [offset, event]);
    } catch (error) {
      this.logger.notify(["console"], {
        level: "error",
        message: "Error updating next ID in SQLite database",
        additionalInfo: { error: error.toString() },
      });
    }
  }

  public async getOffset(event: string): Promise<number | null> {
    await this.isInitialized();
    try {
      const result = await this.db.get("SELECT id FROM messages WHERE event = ? ORDER BY id DESC LIMIT 1", [
        event,
      ]);
      return result ? result.id : 0;
    } catch (error) {
      this.logger.notify(["console"], {
        level: "error",
        message: "Error getting last ID from SQLite database",
        additionalInfo: { error: error.toString() },
      });
      return null;
    }
  }

  public async getMessages(event: string): Promise<any[]> {
    await this.isInitialized();
    try {
      const result = await this.db.all("SELECT * FROM messages WHERE event = ?", [event]);
      return result;
    } catch (error) {
      this.logger.notify(["console"], {
        level: "error",
        message: "Error getting messages from SQLite database",
        additionalInfo: { error: error.toString() },
      });
      return [];
    }
  }

  private async scheduleExpiredMessageDeletion(): Promise<void> {
    schedule.scheduleJob("* * * * *", async () => {
      console.log("Executando rotina de exclusão de mensagens expiradas");
      await this.isInitialized();
      try {
        await this.db.run("DELETE FROM messages WHERE expiration_date < ?", [Date.now()]);
      } catch (error) {
        this.logger.notify(["console"], {
          level: "error",
          message: "Error deleting expired messages from SQLite database",
          additionalInfo: { error: error.toString() },
        });
      }
    });
  }
}
