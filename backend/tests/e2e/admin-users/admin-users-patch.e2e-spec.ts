import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';

describe('Admin Users - PATCH (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let systemAdminToken: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma, {
      isSystemAdmin: true,
    });
    systemAdminToken = auth.accessToken;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('atualiza nome, email e senha do usuário', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .send({
        email: 'admin-user-edit@example.com',
        name: 'Usuário Original',
        password: 'senha-original',
        role: 'VIEWER',
      })
      .expect(201);

    const updateData = {
      email: 'admin-user-updated@example.com',
      name: 'Usuário Atualizado',
      password: 'x',
    };

    const response = await request(app.getHttpServer())
      .patch(`/api/admin/users/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.email).toBe(updateData.email);
    expect(response.body.name).toBe(updateData.name);
    expect(response.body).not.toHaveProperty('password');

    const updatedUser = await prisma.user.findUnique({
      where: { id: createResponse.body.id },
    });
    expect(updatedUser?.email).toBe(updateData.email);
    expect(updatedUser?.name).toBe(updateData.name);
    expect(
      await bcrypt.compare(updateData.password, updatedUser!.password!)
    ).toBe(true);
  });
});
