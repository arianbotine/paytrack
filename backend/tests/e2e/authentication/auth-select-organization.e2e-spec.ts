import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { setupE2ETest, teardownE2ETest } from '../../helpers';
import { randomUUID } from 'node:crypto';

describe('Auth - Select Organization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let userId: string;
  let organization1Id: string;
  let organization2Id: string;
  let accessToken: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    // Criar duas organizações
    organization1Id = randomUUID();
    organization2Id = randomUUID();

    await prisma.organization.createMany({
      data: [
        {
          id: organization1Id,
          name: 'Organization 1',
          isActive: true,
        },
        {
          id: organization2Id,
          name: 'Organization 2',
          isActive: true,
        },
      ],
    });

    // Criar usuário associado a ambas as organizações
    userId = randomUUID();
    const email = `test_${randomUUID()}@example.com`;
    const hashedPassword = await import('bcryptjs').then(bcrypt =>
      bcrypt.hash('testpassword', 10)
    );

    await prisma.user.create({
      data: {
        id: userId,
        email,
        name: 'Test User',
        password: hashedPassword,
        isActive: true,
        isSystemAdmin: false,
        organizations: {
          createMany: {
            data: [
              {
                organizationId: organization1Id,
                role: 'OWNER',
                isActive: true,
              },
              {
                organizationId: organization2Id,
                role: 'ADMIN',
                isActive: true,
              },
            ],
          },
        },
      },
    });

    // Login inicial (sem organização selecionada)
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'testpassword' })
      .expect(200);

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('POST /auth/select-organization', () => {
    it('deve selecionar organização e retornar novo token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/select-organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ organizationId: organization2Id })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.availableOrganizations).toHaveLength(2);
      expect(response.body.user.currentOrganization.id).toBe(organization2Id);
    });

    it('deve retornar 401 para organização não associada ao usuário', async () => {
      const otherOrgId = randomUUID();
      await prisma.organization.create({
        data: {
          id: otherOrgId,
          name: 'Other Organization',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .post('/api/auth/select-organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ organizationId: otherOrgId })
        .expect(401);
    });

    it('deve retornar 401 para organização inexistente', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/select-organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ organizationId: randomUUID() })
        .expect(401);
    });
  });
});
