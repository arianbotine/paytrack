import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { setupE2ETest, teardownE2ETest } from '../../helpers';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

describe('Auth - Login (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let email: string;
  let password: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    // Criar dados de teste manualmente (não usar helper pois queremos testar login)
    const organizationId = randomUUID();
    email = `test_${randomUUID()}@example.com`;
    password = 'testpassword';
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Test Organization',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        name: 'Test User',
        password: hashedPassword,
        isActive: true,
        isSystemAdmin: false,
        organizations: {
          create: {
            organizationId,
            role: 'OWNER',
            isActive: true,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('POST /auth/login - deve autenticar usuário e retornar token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(email);
    // refreshToken is set as httpOnly cookie
    expect(response.headers['set-cookie']).toBeDefined();
  });
});
