import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { parseWsUserFromToken } from './ws-auth';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token ?? client.handshake.headers?.authorization;
    const user = parseWsUserFromToken(token);

    if (!user) {
      client.disconnect(true);
      return;
    }

    client.data.user = user;

    // Rooms
    client.join(`user:${user.userId}`);

    if (user.roles.includes('OWNER') || user.roles.includes('ADMIN')) {
      client.join('role:OWNER');
    }
  }

  handleDisconnect(_client: Socket) {}

  emitToUser(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }

  emitToOwners(payload: any) {
    this.server.to('role:OWNER').emit('notification', payload);
  }
}
