import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { ErrorFilter } from '../src/common/filters/error.filter';
import { LoggerService } from '../src/common/logger/logger.service';
import { PrismaService } from '../src/prisma/prisma.service';

const E2E_EMAIL = 'e2e-journey@test.local';
const E2E_PASSWORD = 'Password1';
const E2E_NAME = 'E2E';
const PREFIX = 'api/v1';

/* E2E — FULL USER JOURNEY */
describe('Full user journey (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string[];
  let shareToken: string;
  let fileId: number;
  let tagId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    await prisma.user.deleteMany({ where: { email: E2E_EMAIL } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: E2E_EMAIL } });
    await app.close();
  });

  /* STEP 1 — REGISTER */
  it('1. register -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/register`)
      .send({ email: E2E_EMAIL, password: E2E_PASSWORD, name: E2E_NAME })
      .expect(201);

    expect(res.body.status).toBe('success');
  });

  /* STEP 2 — LOGIN */
  it('2. login (web) -> 200 + httpOnly cookie', async () => {
    const res = await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/login`)
      .send({ email: E2E_EMAIL, password: E2E_PASSWORD, isMobile: false })
      .expect(200);

    expect(res.headers['set-cookie']).toBeDefined();
    cookie = res.headers['set-cookie'] as string[];
  });

  /* STEP 3 — UPLOAD */
  it('3. upload file -> 201 + shareToken', async () => {
    const res = await request(app.getHttpServer())
      .post(`/${PREFIX}/files`)
      .set('Cookie', cookie)
      .attach('file', Buffer.from('e2e test file content'), 'e2e-test.txt')
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.data.shareToken).toBeDefined();
    shareToken = res.body.data.shareToken as string;
    fileId = res.body.data.id as number;
  });

  /* STEP 4 — LIST FILES */
  it('4. get files list -> 200 + array', async () => {
    const res = await request(app.getHttpServer())
      .get(`/${PREFIX}/files`)
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((f: { id: number }) => f.id === fileId)).toBe(true);
  });

  /* STEP 5 — DOWNLOAD METADATA */
  it('5. get download metadata -> 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/${PREFIX}/download/${shareToken}`)
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.filename).toBeDefined();
  });

  /* STEP 6 — DOWNLOAD FILE */
  it('6. download file -> 200 stream', async () => {
    const res = await request(app.getHttpServer())
      .post(`/${PREFIX}/download/${shareToken}`)
      .send({})
      .expect(200);

    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  /* STEP 7 — CREATE TAG */
  it('7. create tag -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`/${PREFIX}/tags`)
      .set('Cookie', cookie)
      .send({ name: 'e2e-tag' })
      .expect(201);

    expect(res.body.status).toBe('success');
    tagId = res.body.data.id as number;
  });

  /* STEP 8 — LIST TAGS */
  it('8. list tags -> 200 + tag present', async () => {
    const res = await request(app.getHttpServer())
      .get(`/${PREFIX}/tags`)
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.some((t: { id: number }) => t.id === tagId)).toBe(true);
  });

  /* STEP 9 — DELETE TAG */
  it('9. delete tag -> 204', async () => {
    await request(app.getHttpServer())
      .delete(`/${PREFIX}/tags/${tagId}`)
      .set('Cookie', cookie)
      .expect(204);
  });

  /* STEP 10 — DELETE FILE */
  it('10. delete file -> 204', async () => {
    await request(app.getHttpServer())
      .delete(`/${PREFIX}/files/${fileId}`)
      .set('Cookie', cookie)
      .expect(204);
  });

  /* STEP 11 — LOGOUT */
  it('11. logout -> 200', async () => {
    const res = await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/logout`)
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.status).toBe('success');
  });

  /* STEP 12 — PROTECTED ROUTE WITHOUT AUTH */
  it('12. get files without cookie -> 401', async () => {
    await request(app.getHttpServer())
      .get(`/${PREFIX}/files`)
      .expect(401);
  });
});

