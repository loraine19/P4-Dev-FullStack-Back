import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { ErrorFilter } from '../src/common/filters/error.filter';
import { LoggerService } from '../src/common/logger/logger.service';

const TEST_EMAIL = 'integration-tags@test.local';
const TEST_EMAIL_B = 'integration-tags-b@test.local';
const TEST_PASSWORD = 'Password1';
const PREFIX = 'api/v1';

/* TAGS INTEGRATION */
describe('Tags routes (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string[];
  let cookieB: string[];
  let createdTagId: number;

  const loginAs = async (email: string): Promise<string[]> => {
    const res = await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/login`)
      .send({ email, password: TEST_PASSWORD, isMobile: false });
    return res.headers['set-cookie'] as unknown as string[];
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    const logger = app.get(LoggerService);
    app.useLogger(logger);
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(
      new PrismaExceptionFilter(logger),
      new ErrorFilter(logger),
      new HttpExceptionFilter(logger),
    );
    app.setGlobalPrefix(PREFIX);
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, TEST_EMAIL_B] } } });

    await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/register`)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'TagsTest' });
    await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/register`)
      .send({ email: TEST_EMAIL_B, password: TEST_PASSWORD, name: 'TagsTestB' });

    cookie = await loginAs(TEST_EMAIL);
    cookieB = await loginAs(TEST_EMAIL_B);
  });

  afterAll(async () => {
    // cascade: user delete → tags deleted automatically (onDelete: Cascade)
    await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, TEST_EMAIL_B] } } });
    await app.close();
  });

  /* 1 GET /tags */
  describe(`GET /${PREFIX}/tags`, () => {
    it('1.1 utilisateur connecté -> 200 + tableau vide ou non', async () => {
      const res = await request(app.getHttpServer()).get(`/${PREFIX}/tags`).set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('1.2 sans authentification -> 401', async () => {
      const res = await request(app.getHttpServer()).get(`/${PREFIX}/tags`);
      expect(res.status).toBe(401);
    });
  });

  /* 2 POST /tags */
  describe(`POST /${PREFIX}/tags`, () => {
    it('2.1 nom libre -> 201 + tag avec id et name', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/tags`)
        .set('Cookie', cookie)
        .send({ name: 'design' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('design');
      expect(res.body.data.id).toBeDefined();
      createdTagId = res.body.data.id;
    });

    it('2.2 doublon même utilisateur -> 409', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/tags`)
        .set('Cookie', cookie)
        .send({ name: 'design' });
      expect(res.status).toBe(409);
    });

    it('2.3 même nom autre utilisateur -> 201 (isolation : pas un doublon)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/tags`)
        .set('Cookie', cookieB)
        .send({ name: 'design' });
      expect(res.status).toBe(201);
    });

    it('2.4 sans authentification -> 401', async () => {
      const res = await request(app.getHttpServer()).post(`/${PREFIX}/tags`).send({ name: 'test' });
      expect(res.status).toBe(401);
    });
  });

  /* 3 DELETE /tags/:id */
  describe(`DELETE /${PREFIX}/tags/:id`, () => {
    it('3.1 autre utilisateur -> 403', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/${PREFIX}/tags/${createdTagId}`)
        .set('Cookie', cookieB);
      expect(res.status).toBe(403);
    });

    it('3.2 tag inexistant -> 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/${PREFIX}/tags/999999`)
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });

    it('3.3 sans authentification -> 401', async () => {
      const res = await request(app.getHttpServer()).delete(`/${PREFIX}/tags/${createdTagId}`);
      expect(res.status).toBe(401);
    });

    it('3.4 propriétaire -> 204', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/${PREFIX}/tags/${createdTagId}`)
        .set('Cookie', cookie);
      expect(res.status).toBe(204);
    });
  });

  /* 4 E2E -  FLUX TAGS + ISOLATION */
  describe('E2E: login → createTag → listTags → deleteTag', () => {
    it('4.1 flux complet : création → présent dans la liste → suppression', async () => {
      /* create */
      const create = await request(app.getHttpServer())
        .post(`/${PREFIX}/tags`)
        .set('Cookie', cookie)
        .send({ name: 'e2e-tag' });
      expect(create.status).toBe(201);
      const tagId: number = create.body.data.id;

      /* list userA -  tag présent */
      const listA = await request(app.getHttpServer()).get(`/${PREFIX}/tags`).set('Cookie', cookie);
      expect(listA.body.data.some((t: { id: number }) => t.id === tagId)).toBe(true);

      /* list userB -  tag absent (isolation) */
      const listB = await request(app.getHttpServer()).get(`/${PREFIX}/tags`).set('Cookie', cookieB);
      expect(listB.body.data.some((t: { id: number }) => t.id === tagId)).toBe(false);

      /* delete */
      const del = await request(app.getHttpServer())
        .delete(`/${PREFIX}/tags/${tagId}`)
        .set('Cookie', cookie);
      expect(del.status).toBe(204);

      /* list userA -  tag disparu */
      const listA2 = await request(app.getHttpServer()).get(`/${PREFIX}/tags`).set('Cookie', cookie);
      expect(listA2.body.data.some((t: { id: number }) => t.id === tagId)).toBe(false);
    });

    it('4.2 isolation données : userB ne peut pas supprimer tag de userA', async () => {
      const create = await request(app.getHttpServer())
        .post(`/${PREFIX}/tags`)
        .set('Cookie', cookie)
        .send({ name: 'isolation-tag' });
      const tagId: number = create.body.data.id;

      const del = await request(app.getHttpServer())
        .delete(`/${PREFIX}/tags/${tagId}`)
        .set('Cookie', cookieB);
      expect(del.status).toBe(403);

      // cleanup
      await request(app.getHttpServer())
        .delete(`/${PREFIX}/tags/${tagId}`)
        .set('Cookie', cookie);
    });
  });
});
