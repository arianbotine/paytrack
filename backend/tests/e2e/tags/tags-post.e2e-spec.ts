import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Tags - POST (e2e)', () => {
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

  describe('POST /tags', () => {
    it('deve criar tag e persistir no banco', async () => {
      const tagData = {
        name: 'Urgente',
        color: '#EF4444',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tagData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(tagData.name.toUpperCase()); // Transform to uppercase
      expect(response.body.color).toBe(tagData.color);

      const tagInDb = await prisma.tag.findUnique({
        where: { id: response.body.id },
      });

      expect(tagInDb).toBeTruthy();
      expect(tagInDb?.name).toBe(tagData.name.toUpperCase());
      expect(tagInDb?.organizationId).toBe(organizationId);
    });

    it('deve criar tag sem cor opcional', async () => {
      const tagData = {
        name: 'Importante',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tagData)
        .expect(201);

      expect(response.body.name).toBe(tagData.name.toUpperCase());
      expect(response.body.color).toBe('#3B82F6'); // Cor padrão quando não fornecida
    });

    it('deve retornar 400 para dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' }) // Nome vazio
        .expect(400);
    });

    it('deve associar tag à organização do usuário logado', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Teste Multi-Tenancy' })
        .expect(201);

      const tag = await prisma.tag.findUnique({
        where: { id: response.body.id },
      });

      expect(tag?.organizationId).toBe(organizationId);
    });
  });
});
