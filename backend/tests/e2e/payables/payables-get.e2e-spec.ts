import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import request = require('supertest');
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import {
  PayableFactory,
  CategoryFactory,
  VendorFactory,
  TagFactory,
} from '../../factories';

describe('[Contas a Pagar] GET /api/payables', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve retornar lista vazia quando não há contas a pagar', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);

    const response = await request(app.getHttpServer())
      .get('/api/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [],
      total: 0,
    });
  });

  it('deve retornar contas a pagar da organização', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });
    await payableFactory.createMany(3, { organizationId, vendorId: vendor.id });

    const response = await request(app.getHttpServer())
      .get('/api/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(response.body.total).toBe(3);
  });

  it('deve filtrar contas a pagar por status', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });

    await payableFactory.createWithStatus('PENDING', {
      organizationId,
      vendorId: vendor.id,
    });
    await payableFactory.createWithStatus('PAID', {
      organizationId,
      vendorId: vendor.id,
    });
    await payableFactory.createWithStatus('PENDING', {
      organizationId,
      vendorId: vendor.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/payables?status=PENDING')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(
      response.body.data.every(
        (p: { status: string }) => p.status === 'PENDING'
      )
    ).toBe(true);
  });

  it('deve filtrar contas a pagar por categoria', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const categoryFactory = new CategoryFactory(prisma);
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const category = await categoryFactory.create({
      organizationId,
      type: 'PAYABLE',
    });
    const vendor = await vendorFactory.create({ organizationId });

    await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      categoryId: category.id,
    });
    await payableFactory.create({ organizationId, vendorId: vendor.id });

    const response = await request(app.getHttpServer())
      .get(`/api/payables?categoryId=${category.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].categoryId).toBe(category.id);
  });

  it('deve filtrar contas a pagar por credor', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor1 = await vendorFactory.create({ organizationId });
    const vendor2 = await vendorFactory.create({ organizationId });

    await payableFactory.create({ organizationId, vendorId: vendor1.id });
    await payableFactory.create({ organizationId, vendorId: vendor2.id });

    const response = await request(app.getHttpServer())
      .get(`/api/payables?vendorId=${vendor1.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].vendorId).toBe(vendor1.id);
  });

  it('deve filtrar contas a pagar por tag', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const tagFactory = new TagFactory(prisma);
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const tag = await tagFactory.create({ organizationId });
    const vendor = await vendorFactory.create({ organizationId });

    await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      tags: [tag.id],
    });
    await payableFactory.create({ organizationId, vendorId: vendor.id });

    const response = await request(app.getHttpServer())
      .get(`/api/payables?tagIds=${tag.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
  });

  it('deve suportar paginação', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });
    await payableFactory.createMany(25, {
      organizationId,
      vendorId: vendor.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/payables?skip=10&take=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(10);
    expect(response.body.total).toBe(25);
  });

  it('não deve retornar contas de outras organizações', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const { organizationId: otherOrgId } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor1 = await vendorFactory.create({ organizationId });
    const vendor2 = await vendorFactory.create({ organizationId: otherOrgId });

    await payableFactory.create({ organizationId, vendorId: vendor1.id });
    await payableFactory.create({
      organizationId: otherOrgId,
      vendorId: vendor2.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].organizationId).toBe(organizationId);
  });

  it('deve ocultar contas concluídas quando hideCompleted=true', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });

    await payableFactory.createWithStatus('PENDING', {
      organizationId,
      vendorId: vendor.id,
    });
    await payableFactory.createWithStatus('PAID', {
      organizationId,
      vendorId: vendor.id,
    });
    await payableFactory.createWithStatus('PARTIAL', {
      organizationId,
      vendorId: vendor.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/payables?hideCompleted=true')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(
      response.body.data.every((p: { status: string }) => p.status !== 'PAID')
    ).toBe(true);
  });

  it('deve incluir contas concluídas quando hideCompleted=false', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });

    await payableFactory.createWithStatus('PENDING', {
      organizationId,
      vendorId: vendor.id,
    });
    await payableFactory.createWithStatus('PAID', {
      organizationId,
      vendorId: vendor.id,
    });
    await payableFactory.createWithStatus('PARTIAL', {
      organizationId,
      vendorId: vendor.id,
    });

    const response = await request(app.getHttpServer())
      .get('/api/payables?hideCompleted=false')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(
      response.body.data.some((p: { status: string }) => p.status === 'PAID')
    ).toBe(true);
  });

  it('deve retornar 401 quando não autenticado', async () => {
    await request(app.getHttpServer()).get('/api/payables').expect(401);
  });
});
