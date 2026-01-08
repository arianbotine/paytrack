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

describe('[Contas a Pagar] GET /api/payables/:id', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve retornar conta a pagar por ID', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });
    const payable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      notes: 'Conta Teste',
      amount: 1500,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/payables/${payable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: payable.id,
      notes: 'Conta Teste',
      amount: 1500,
      organizationId,
    });
  });

  it('deve incluir parcelas na resposta', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({ organizationId });
    const payable = await payableFactory.createWithInstallments(3, {
      organizationId,
      vendorId: vendor.id,
      amount: 3000,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/payables/${payable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.installments).toHaveLength(3);
    expect(response.body.installments[0].amount).toBe(1000);
  });

  it('deve incluir categoria na resposta', async () => {
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
      name: 'Despesas Operacionais',
    });
    const vendor = await vendorFactory.create({ organizationId });

    const payable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      categoryId: category.id,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/payables/${payable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.category).toMatchObject({
      id: category.id,
      name: 'Despesas Operacionais',
    });
  });

  it('deve incluir credor na resposta', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const vendor = await vendorFactory.create({
      organizationId,
      name: 'Fornecedor XYZ',
    });

    const payable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/payables/${payable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.vendor).toMatchObject({
      id: vendor.id,
      name: 'Fornecedor XYZ',
    });
  });

  it('deve incluir tags na resposta', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const tagFactory = new TagFactory(prisma);
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const tag1 = await tagFactory.create({ organizationId, name: 'Urgente' });
    const tag2 = await tagFactory.create({
      organizationId,
      name: 'Recorrente',
    });
    const vendor = await vendorFactory.create({ organizationId });

    const payable = await payableFactory.create({
      organizationId,
      vendorId: vendor.id,
      tags: [tag1.id, tag2.id],
    });

    const response = await request(app.getHttpServer())
      .get(`/api/payables/${payable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.tags).toHaveLength(2);
    expect(
      response.body.tags.map((t: { tag: { name: string } }) => t.tag.name)
    ).toContain('Urgente');
    expect(
      response.body.tags.map((t: { tag: { name: string } }) => t.tag.name)
    ).toContain('Recorrente');
  });

  it('deve retornar 404 para ID inexistente', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/api/payables/${fakeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('deve retornar 404 ao tentar acessar conta de outra organização', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);
    const { organizationId: otherOrgId } = await createAuthenticatedUser(
      app,
      prisma
    );
    const vendorFactory = new VendorFactory(prisma);
    const payableFactory = new PayableFactory(prisma);

    const otherVendor = await vendorFactory.create({
      organizationId: otherOrgId,
    });
    const payable = await payableFactory.create({
      organizationId: otherOrgId,
      vendorId: otherVendor.id,
    });

    await request(app.getHttpServer())
      .get(`/api/payables/${payable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('deve retornar 404 para ID inválido', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);

    await request(app.getHttpServer())
      .get('/api/payables/invalid-uuid')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('deve retornar 401 quando não autenticado', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/api/payables/${fakeId}`)
      .expect(401);
  });
});
