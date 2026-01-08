import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CategoryFactory } from '../../factories';

describe('Categories - DELETE (e2e)', () => {
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

    const auth = await createAuthenticatedUser(app, prisma);
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('DELETE /categories/:id', () => {
    it('deve excluir categoria', async () => {
      const factory = new CategoryFactory(prisma);
      const category = await factory.create({
        organizationId,
        name: 'Categoria para Deletar',
      });

      await request(app.getHttpServer())
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const deleted = await prisma.category.findUnique({
        where: { id: category.id },
      });

      expect(deleted).toBeNull();
    });

    it('deve retornar 404 para categoria inexistente', async () => {
      await request(app.getHttpServer())
        .delete('/api/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('deve retornar 404 para categoria de outra organização', async () => {
      const otherAuth = await createAuthenticatedUser(app, prisma);
      const factory = new CategoryFactory(prisma);
      const category = await factory.create({
        organizationId: otherAuth.organizationId,
        name: 'Categoria Outra Org',
      });

      await request(app.getHttpServer())
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
