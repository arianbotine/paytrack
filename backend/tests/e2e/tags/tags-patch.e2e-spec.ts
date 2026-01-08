import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { TagFactory } from '../../factories';

describe('Tags - PATCH (e2e)', () => {
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

  describe('PATCH /tags/:id', () => {
    it('deve atualizar tag existente', async () => {
      const tagFactory = new TagFactory(prisma);
      const tag = await tagFactory.create({
        organizationId,
        name: 'Original',
        color: '#000000',
      });

      const updateData = {
        name: 'Atualizada',
        color: '#FFFFFF',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name.toUpperCase());
      expect(response.body.color).toBe(updateData.color);

      const updated = await prisma.tag.findUnique({
        where: { id: tag.id },
      });

      expect(updated?.name).toBe(updateData.name.toUpperCase());
      expect(updated?.color).toBe(updateData.color);
    });

    it('deve atualizar apenas campos enviados', async () => {
      const tagFactory = new TagFactory(prisma);
      const tag = await tagFactory.create({
        organizationId,
        name: 'Original',
        color: '#000000',
      });

      const updateData = { name: 'Apenas Nome' };

      const response = await request(app.getHttpServer())
        .patch(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name.toUpperCase());
      expect(response.body.color).toBe('#000000'); // Mantém original
    });

    it('deve retornar 404 para tag inexistente', () => {
      return request(app.getHttpServer())
        .patch('/api/tags/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Teste' })
        .expect(404);
    });

    it('não deve permitir atualizar tag de outra organização', async () => {
      const user2 = await createAuthenticatedUser(app, prisma);
      const tagFactory = new TagFactory(prisma);
      const tag = await tagFactory.create({
        organizationId: user2.organizationId,
      });

      return request(app.getHttpServer())
        .patch(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Tentativa' })
        .expect(404);
    });
  });
});
