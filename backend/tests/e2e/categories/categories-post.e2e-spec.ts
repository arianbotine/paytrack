import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Categories - POST (e2e)', () => {
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

  it('POST /categories - deve criar categoria e persistir no banco', async () => {
    const categoryData = { name: 'New Category', type: 'PAYABLE' };

    const response = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(categoryData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('NEW CATEGORY');
    expect(response.body.type).toBe('PAYABLE');

    // Validar no banco de dados
    const categoryInDb = await prisma.category.findUnique({
      where: { id: response.body.id },
    });
    expect(categoryInDb).toBeTruthy();
    expect(categoryInDb?.name).toBe('NEW CATEGORY');
    expect(categoryInDb?.organizationId).toBe(organizationId);
  });
});
