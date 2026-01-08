import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CategoryFactory } from '../../factories';

describe('Categories - Get by ID (e2e)', () => {
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

  describe('GET /categories/:id', () => {
    it('deve retornar categoria por ID', async () => {
      const factory = new CategoryFactory(prisma);
      const category = await factory.create({
        organizationId,
        name: 'Categoria Teste',
        type: 'PAYABLE',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('type');
      expect(response.body.id).toBe(category.id);
      expect(response.body.name).toBe('Categoria Teste');
      expect(response.body.type).toBe('PAYABLE');
    });

    it('deve retornar 404 para categoria inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/categories/00000000-0000-0000-0000-000000000000')
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
        .get(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
