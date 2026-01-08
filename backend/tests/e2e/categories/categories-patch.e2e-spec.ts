import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CategoryFactory } from '../../factories';

describe('Categories - PATCH (e2e)', () => {
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

  describe('PATCH /categories/:id', () => {
    it('deve atualizar categoria existente', async () => {
      const factory = new CategoryFactory(prisma);
      const category = await factory.create({
        organizationId,
        name: 'Categoria Original',
        type: 'PAYABLE',
      });

      const updateData = {
        name: 'Categoria Atualizada',
        isActive: false,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('CATEGORIA ATUALIZADA'); // Transformado para maiúsculo
      expect(response.body.isActive).toBe(updateData.isActive);

      const updated = await prisma.category.findUnique({
        where: { id: category.id },
      });

      expect(updated?.name).toBe(updateData.name.toUpperCase());
      expect(updated?.isActive).toBe(updateData.isActive);
    });

    it('deve atualizar apenas campos enviados', async () => {
      const factory = new CategoryFactory(prisma);
      const category = await factory.create({
        organizationId,
        name: 'Categoria Original',
        type: 'PAYABLE',
      });

      const updateData = { name: 'Nome Atualizado' };

      const response = await request(app.getHttpServer())
        .patch(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('NOME ATUALIZADO'); // Transformado para maiúsculo
      expect(response.body.type).toBe('PAYABLE'); // Não alterado
    });

    it('deve retornar 404 para categoria inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/api/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Teste' })
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
        .patch(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Tentativa' })
        .expect(404);
    });
  });
});
