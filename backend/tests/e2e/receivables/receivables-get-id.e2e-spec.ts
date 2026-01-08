import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import request = require('supertest');
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import {
  ReceivableFactory,
  CategoryFactory,
  CustomerFactory,
  TagFactory,
} from '../../factories';

describe('[Contas a Receber] GET /api/receivables/:id', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    ({ app, prisma, testSchema } = await setupE2ETest());
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('deve retornar conta a receber por ID', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer = await customerFactory.create({ organizationId });
    const receivable = await receivableFactory.create({
      organizationId,
      customerId: customer.id,
      notes: 'Conta Teste',
      amount: 1500,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/receivables/${receivable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: receivable.id,
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
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer = await customerFactory.create({ organizationId });
    const receivable = await receivableFactory.createWithInstallments(3, {
      organizationId,
      customerId: customer.id,
      amount: 3000,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/receivables/${receivable.id}`)
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
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const category = await categoryFactory.create({
      organizationId,
      type: 'RECEIVABLE',
      name: 'Receitas Operacionais',
    });
    const customer = await customerFactory.create({ organizationId });

    const receivable = await receivableFactory.create({
      organizationId,
      customerId: customer.id,
      categoryId: category.id,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/receivables/${receivable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.category).toMatchObject({
      id: category.id,
      name: 'Receitas Operacionais',
    });
  });

  it('deve incluir devedor (customer) na resposta', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const customer = await customerFactory.create({
      organizationId,
      name: 'Cliente XYZ',
    });

    const receivable = await receivableFactory.create({
      organizationId,
      customerId: customer.id,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/receivables/${receivable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.customer).toMatchObject({
      id: customer.id,
      name: 'Cliente XYZ',
    });
  });

  it('deve incluir tags na resposta', async () => {
    const { organizationId, accessToken } = await createAuthenticatedUser(
      app,
      prisma
    );
    const tagFactory = new TagFactory(prisma);
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const tag1 = await tagFactory.create({ organizationId, name: 'Urgente' });
    const tag2 = await tagFactory.create({
      organizationId,
      name: 'Recorrente',
    });
    const customer = await customerFactory.create({ organizationId });

    const receivable = await receivableFactory.create({
      organizationId,
      customerId: customer.id,
      tags: [tag1.id, tag2.id],
    });

    const response = await request(app.getHttpServer())
      .get(`/api/receivables/${receivable.id}`)
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
      .get(`/api/receivables/${fakeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('deve retornar 404 ao tentar acessar conta de outra organização', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);
    const { organizationId: otherOrgId } = await createAuthenticatedUser(
      app,
      prisma
    );
    const customerFactory = new CustomerFactory(prisma);
    const receivableFactory = new ReceivableFactory(prisma);

    const otherCustomer = await customerFactory.create({
      organizationId: otherOrgId,
    });
    const receivable = await receivableFactory.create({
      organizationId: otherOrgId,
      customerId: otherCustomer.id,
    });

    await request(app.getHttpServer())
      .get(`/api/receivables/${receivable.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('deve retornar 404 para ID inválido', async () => {
    const { accessToken } = await createAuthenticatedUser(app, prisma);

    await request(app.getHttpServer())
      .get('/api/receivables/invalid-uuid')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('deve retornar 401 quando não autenticado', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/api/receivables/${fakeId}`)
      .expect(401);
  });
});
