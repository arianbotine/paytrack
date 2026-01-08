import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { UserRole } from '@prisma/client';

describe('Users - DELETE (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let organizationId: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma, {
      role: 'OWNER',
    });
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('DELETE /users/:id', () => {
    it('deve remover usuário da organização', async () => {
      // Criar usuário para deletar
      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `delete_${randomUUID()}@test.com`,
          password: 'senha123',
          name: 'Usuário para Deletar',
          role: UserRole.ACCOUNTANT,
        })
        .expect(201);

      const userToDeleteId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/api/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar que a associação foi removida, mas o usuário ainda existe
      const userStillExists = await prisma.user.findUnique({
        where: { id: userToDeleteId },
      });
      expect(userStillExists).not.toBeNull();

      const associationRemoved = await prisma.userOrganization.findFirst({
        where: { userId: userToDeleteId, organizationId },
      });
      expect(associationRemoved).toBeNull();
    });

    it('deve retornar 404 para usuário inexistente', () => {
      return request(app.getHttpServer())
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('não deve permitir remover usuário de outra organização', async () => {
      // Criar usuário em outra organização
      const org2 = await createAuthenticatedUser(app, prisma);
      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${org2.accessToken}`)
        .send({
          email: `otherdelete_${randomUUID()}@test.com`,
          password: 'senha123',
          name: 'Outro para Deletar',
          role: UserRole.ACCOUNTANT,
        })
        .expect(201);

      return request(app.getHttpServer())
        .delete(`/api/users/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('VIEWER não deve poder remover usuário', async () => {
      const viewer = await createAuthenticatedUser(app, prisma, {
        role: 'VIEWER',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `viewerdelete_${randomUUID()}@test.com`,
          password: 'senha123',
          name: 'Para Viewer Deletar',
          role: UserRole.ACCOUNTANT,
        })
        .expect(201);

      return request(app.getHttpServer())
        .delete(`/api/users/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .expect(403);
    });

    it('não deve permitir usuário remover a si mesmo', async () => {
      // Criar outro OWNER para testar
      const owner2 = await createAuthenticatedUser(app, prisma, {
        role: 'OWNER',
      });

      return request(app.getHttpServer())
        .delete(`/api/users/${owner2.userId}`)
        .set('Authorization', `Bearer ${owner2.accessToken}`)
        .expect(409); // Conflict se tentar remover a si mesmo
    });
  });
});
