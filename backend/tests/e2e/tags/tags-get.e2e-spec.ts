import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { TagFactory } from '../../factories';

describe('Tags - GET (e2e)', () => {
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

    // Criar tags de teste
    const tagFactory = new TagFactory(prisma);
    await tagFactory.createMany(3, { organizationId });
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('GET /tags', () => {
    const validateTag = (tag: any) => {
      expect(tag).toHaveProperty('id');
      expect(tag).toHaveProperty('name');
      expect(tag).toHaveProperty('color');
      expect(tag).toHaveProperty('organizationId');
    };

    it('deve retornar array de tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      response.body.forEach(validateTag);
    });

    it('deve retornar 401 sem autenticação', () => {
      return request(app.getHttpServer()).get('/api/tags').expect(401);
    });

    it('deve retornar apenas tags da organização do usuário', async () => {
      // Criar segunda organização com tags
      const user2 = await createAuthenticatedUser(app, prisma);
      const tagFactory = new TagFactory(prisma);
      await tagFactory.create({
        organizationId: user2.organizationId,
        name: 'Tag Org 2',
      });

      // User 1 não deve ver tag da Org 2
      const response = await request(app.getHttpServer())
        .get('/api/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const hasOtherOrgTag = response.body.some(
        (tag: any) => tag.name === 'Tag Org 2'
      );
      expect(hasOtherOrgTag).toBe(false);
    });
  });

  describe('GET /tags/:id', () => {
    it('deve retornar tag por ID', async () => {
      const tagFactory = new TagFactory(prisma);
      const tag = await tagFactory.create({ organizationId });

      const response = await request(app.getHttpServer())
        .get(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(tag.id);
      expect(response.body.name).toBe(tag.name);
      expect(response.body.organizationId).toBe(organizationId);
    });

    it('deve retornar 404 para tag inexistente', () => {
      return request(app.getHttpServer())
        .get('/api/tags/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('deve retornar 404 para tag de outra organização', async () => {
      const user2 = await createAuthenticatedUser(app, prisma);
      const tagFactory = new TagFactory(prisma);
      const tag = await tagFactory.create({
        organizationId: user2.organizationId,
      });

      return request(app.getHttpServer())
        .get(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
