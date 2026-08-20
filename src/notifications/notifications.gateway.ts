
// src/notifications/notifications.gateway.ts

import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { Server, Socket } from 'socket.io';

import { JwtPayload } from '../common/decorators/current-user.decorator';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  // Will be assigned by the WebSocketGateway at runtime
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ----------------------------------------------------
  // Socket connection
  // ----------------------------------------------------

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload =
        this.jwtService.verify<JwtPayload>(token, {
          secret: this.configService.get<string>(
            'JWT_ACCESS_SECRET',
          ),
        });

      if (!payload?.userId) {
        client.disconnect(true);
        return;
      }

      // Store authenticated user data on the socket.
      client.data.user = payload;

      // Join only the room belonging to the verified JWT user.
      await client.join(`user:${payload.userId}`);
    } catch {
      // Invalid, expired, or malformed JWT.
      client.disconnect(true);
    }
  }

  // ----------------------------------------------------
  // Extract JWT from Socket.IO handshake
  // ----------------------------------------------------

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.trim()) {
      return this.normalizeBearerToken(authToken);
    }

    const authorizationHeader =
      client.handshake.headers.authorization;

    if (
      typeof authorizationHeader === 'string' &&
      authorizationHeader.trim()
    ) {
      return this.normalizeBearerToken(
        authorizationHeader,
      );
    }

    return undefined;
  }

  private normalizeBearerToken(token: string): string {
    return token.startsWith('Bearer ')
      ? token.substring(7).trim()
      : token.trim();
  }

  // ----------------------------------------------------
  // Socket disconnection
  // ----------------------------------------------------

  handleDisconnect(client: Socket) {
    // Socket.IO automatically removes the client
    // from its rooms after disconnection.
    delete client.data.user;
  }

  // ----------------------------------------------------
  // Driver profile status changed
  // ----------------------------------------------------

  emitDriverStatusChanged(
    userId: string,
    payload: {
      driverId: string;
      status: string;
      reason?: string;
    },
  ) {
    this.server
      .to(`user:${userId}`)
      .emit('driver.status.changed', payload);
  }

  // ----------------------------------------------------
  // New job match
  // ----------------------------------------------------

  emitJobMatchCreated(
    userId: string,
    payload: {
      driverId: string;
      jobPostingId: string;
    },
  ) {
    this.server
      .to(`user:${userId}`)
      .emit('job.match.created', payload);
  }

  // ----------------------------------------------------
  // Application received
  // ----------------------------------------------------

  emitApplicationReceived(
    userId: string,
    payload: {
      jobPostingId: string;
      applicationId: string;
      driverId: string;
    },
  ) {
    this.server
      .to(`user:${userId}`)
      .emit('application.received', payload);
  }

  // ----------------------------------------------------
  // Application status changed
  // ----------------------------------------------------

  emitApplicationStatusChanged(
    userId: string,
    payload: {
      applicationId: string;
      status: string;
    },
  ) {
    this.server
      .to(`user:${userId}`)
      .emit('application.status.changed', payload);
  }
}

