import { createServer } from "http";
import { Server } from "socket.io";

export class Sender {
  private io: Server;

  constructor(port: number = 3380) {
    const server = createServer();
    this.io = new Server(server);

    server.listen(port, () => {
      console.log("Servidor Socket.IO iniciado na porta + " + port);
    });
  }

  public async send(event: string, values: any[]): Promise<void> {
    this.io.emit(event, values);
  }
}
