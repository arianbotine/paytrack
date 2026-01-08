import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CategoryFactory } from '../../factories';

describe('Categories - Get (e2e)', () => {
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

    // Criar usuário autenticado
    const authContext = await createAuthenticatedUser(app, prisma);
    accessToken = authContext.accessToken;
    organizationId = authContext.organizationId;

    // Criar categorias de teste
    const categoryFactory = new CategoryFactory(prisma);
    await categoryFactory.createBothTypes(organizationId);
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('/categories (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(response.body[0]).toHaveProperty('name');
    expect(response.body[0]).toHaveProperty('type');
  });
});
