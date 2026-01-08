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

describe('Users - PATCH (e2e)', () => {
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

  describe('PATCH /users/:id', () => {
    it('deve atualizar usuário', async () => {
      // Criar usuário para atualizar
      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `update_${randomUUID()}@test.com`,
          password: 'senha123',
          name: 'Usuário Original',
          role: UserRole.ACCOUNTANT,
        })
        .expect(201);

      const userId = createResponse.body.id;
      const updateData = {
        name: 'Usuário Atualizado',
        role: UserRole.ADMIN,
        isActive: false,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.role).toBe(updateData.role);
      expect(response.body.isActive).toBe(updateData.isActive);

      const updated = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(updated?.name).toBe(updateData.name);
      // role está na UserOrganization
      expect(updated?.isActive).toBe(updateData.isActive);
    });

    it('deve retornar 404 para usuário inexistente', () => {
      return request(app.getHttpServer())
        .patch('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Teste' })
        .expect(404);
    });

    it('não deve permitir atualizar usuário de outra organização', async () => {
      const user2 = await createAuthenticatedUser(app, prisma);
      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `other_${randomUUID()}@test.com`,
          password: 'senha123',
          name: 'Outro Usuário',
          role: UserRole.ACCOUNTANT,
        })
        .expect(201);

      return request(app.getHttpServer())
        .patch(`/api/users/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({ name: 'Tentativa' })
        .expect(404);
    });

    it('VIEWER não deve poder atualizar usuário', async () => {
      const viewer = await createAuthenticatedUser(app, prisma, {
        role: 'VIEWER',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `viewer_${randomUUID()}@test.com`,
          password: 'senha123',
          name: 'Para Viewer',
          role: UserRole.ACCOUNTANT,
        })
        .expect(201);

      return request(app.getHttpServer())
        .patch(`/api/users/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ name: 'Tentativa Viewer' })
        .expect(403);
    });
  });

  describe('PATCH /users/me', () => {
    it('deve atualizar perfil do usuário logado', async () => {
      const updateData = {
        name: 'Meu Novo Nome',
        email: `novoemail_${randomUUID()}@test.com`,
      };

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
    });

    it('não deve permitir atualizar role no perfil', async () => {
      const updateData = {
        name: 'Teste',
        role: UserRole.ADMIN, // Não deve ser permitido no perfil
      };

      const response = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(400); // BadRequest porque role não é permitido
    });
  });

  describe('PATCH /users/me/password', () => {
    it('deve alterar senha do usuário logado', async () => {
      const changePasswordData = {
        currentPassword: 'testpassword123', // Senha padrão do helper
        newPassword: 'novaSenha456',
      };

      return request(app.getHttpServer())
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData)
        .expect(200);
    });

    it('deve retornar 400 para senha atual incorreta', () => {
      const changePasswordData = {
        currentPassword: 'senhaErrada',
        newPassword: 'novaSenha456',
      };

      return request(app.getHttpServer())
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData)
        .expect(400);
    });
  });
});
