import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Admin Users - POST (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let systemAdminToken: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    // Criar system admin
    const auth = await createAuthenticatedUser(app, prisma, {
      isSystemAdmin: true,
    });
    systemAdminToken = auth.accessToken;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('POST /admin/users', () => {
    it('deve criar usuário sem organização', async () => {
      const userData = {
        email: `newadmin-${Date.now()}@example.com`,
        name: 'New Admin User',
        password: 'securepassword123',
        role: 'ACCOUNTANT',
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body.name).toBe(userData.name);
      expect(response.body.isSystemAdmin).toBe(false);

      const userInDb = await prisma.user.findUnique({
        where: { id: response.body.id },
        include: { organizations: true },
      });

      expect(userInDb).toBeTruthy();
      expect(userInDb?.email).toBe(userData.email);
      expect(userInDb?.organizations).toHaveLength(0); // Sem organizações
    });

    it('deve criar usuário regular sem organização', async () => {
      const userData = {
        email: `regular-${Date.now()}@example.com`,
        name: 'Regular User',
        password: 'password123',
        role: 'ACCOUNTANT',
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.isSystemAdmin).toBe(false);
    });

    it('deve retornar 400 para email duplicado', async () => {
      const userData1 = {
        email: `duplicate-${Date.now()}@example.com`,
        name: 'User 1',
        password: 'pass123',
        role: 'ACCOUNTANT',
      };

      await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(userData1)
        .expect(201);

      const userData2 = {
        email: userData1.email, // Mesmo email
        name: 'User 2',
        password: 'pass456',
        role: 'ACCOUNTANT',
      };

      await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(userData2)
        .expect(409);
    });

    it('deve retornar 400 para dados inválidos', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({ email: 'invalid' }) // Email inválido
        .expect(400);
    });

    it('deve retornar 403 para usuário não system admin', async () => {
      const regularUser = await createAuthenticatedUser(app, prisma);

      await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${regularUser.accessToken}`)
        .send({
          email: 'test@example.com',
          name: 'Test',
          password: 'pass',
        })
        .expect(403);
    });
  });
});
