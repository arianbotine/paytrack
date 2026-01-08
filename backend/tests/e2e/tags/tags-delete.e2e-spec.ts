import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { TagFactory } from '../../factories';

describe('Tags - DELETE (e2e)', () => {
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

  describe('DELETE /tags/:id', () => {
    it('deve deletar tag', async () => {
      const tagFactory = new TagFactory(prisma);
      const tag = await tagFactory.create({ organizationId });

      await request(app.getHttpServer())
        .delete(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const deleted = await prisma.tag.findUnique({
        where: { id: tag.id },
      });

      expect(deleted).toBeNull();
    });

    it('deve retornar 404 para tag inexistente', () => {
      return request(app.getHttpServer())
        .delete('/api/tags/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('não deve permitir deletar tag de outra organização', async () => {
      const user2 = await createAuthenticatedUser(app, prisma);
      const tagFactory = new TagFactory(prisma);
      const tag = await tagFactory.create({
        organizationId: user2.organizationId,
      });

      return request(app.getHttpServer())
        .delete(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
