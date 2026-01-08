import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { UserRole } from '@prisma/client';

describe('Users - POST (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma, {
      role: 'OWNER',
    });
    accessToken = auth.accessToken;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  describe('POST /users', () => {
    it('deve criar usuário na organização', async () => {
      const userData = {
        email: `novo_${Date.now()}@empresa.com`,
        password: 'senha123',
        name: 'Novo Usuário',
        role: UserRole.ACCOUNTANT,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body.name).toBe(userData.name);
      expect(response.body.role).toBe(userData.role);

      const userInDb = await prisma.user.findUnique({
        where: { id: response.body.id },
      });

      expect(userInDb).toBeTruthy();
      expect(userInDb?.email).toBe(userData.email);
      // organizationId está na relação UserOrganization
    });

    it('deve retornar 400 para email duplicado', async () => {
      const userData = {
        email: `duplicado_${Date.now()}@empresa.com`,
        password: 'senha123',
        name: 'Usuário',
        role: UserRole.ACCOUNTANT,
      };

      // Criar primeiro usuário
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(userData)
        .expect(201);

      // Tentar criar com mesmo email
      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(userData)
        .expect(409);
    });

    it('deve retornar 400 para dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'email-invalido',
          password: '',
          name: '',
          role: 'INVALID_ROLE',
        })
        .expect(400);
    });

    it('VIEWER não deve poder criar usuário', async () => {
      const viewer = await createAuthenticatedUser(app, prisma, {
        role: 'VIEWER',
      });

      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({
          email: 'teste@empresa.com',
          password: 'senha123',
          name: 'Teste',
          role: UserRole.ACCOUNTANT,
        })
        .expect(403);
    });
  });
});
