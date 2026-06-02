import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
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

const TEST_EMAIL = 'integration-download@test.local';
const TEST_PASSWORD = 'Password1';
const FILE_PASSWORD = 'Secret1!';
const PREFIX = 'api/v1';

/* DOWNLOAD INTEGRATION */
describe('Download routes (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string[];
  let shareTokenFree: string;
  let shareTokenProtected: string;
  let shareTokenExpired: string;
  // track uploaded file ids for disk cleanup
  const uploadedFilenames: string[] = [];

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
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });

    await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/register`)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'DownloadTest' });

    const login = await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/login`)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, isMobile: false });
    cookie = login.headers['set-cookie'] as unknown as string[];

    /* upload free file */
    const free = await request(app.getHttpServer())
      .post(`/${PREFIX}/files`)
      .set('Cookie', cookie)
      .attach('file', Buffer.from('free content'), { filename: 'free.txt', contentType: 'text/plain' })
      .field('expirationDays', '7');
    shareTokenFree = free.body.data.shareToken;

    /* upload protected file */
    const prot = await request(app.getHttpServer())
      .post(`/${PREFIX}/files`)
      .set('Cookie', cookie)
      .attach('file', Buffer.from('protected'), { filename: 'protected.txt', contentType: 'text/plain' })
      .field('expirationDays', '7')
      .field('downloadPassword', FILE_PASSWORD);
    shareTokenProtected = prot.body.data.shareToken;

    /* insert expired file in DB (disk file not required) */
    const expiredFakeFilename = `expired-${crypto.randomUUID()}.txt`;
    shareTokenExpired = crypto.randomUUID();
    await prisma.file.create({
      data: {
        filename: expiredFakeFilename,
        originalName: 'expired.txt',
        size: 5,
        mimeType: 'text/plain',
        shareToken: shareTokenExpired,
        downloadPasswordHash: null,
        expiresAt: new Date(Date.now() - 3_600_000), // expiré il y a 1h
      },
    });
  });

  afterAll(async () => {
    // clean disk: files uploaded through the API
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      const files = await prisma.file.findMany({ where: { userId: user.id } });
      for (const f of files) {
        const fp = path.join(process.cwd(), 'uploads', f.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      await prisma.file.deleteMany({ where: { userId: user.id } });
    }
    // clean expired phantom file
    await prisma.file.deleteMany({ where: { shareToken: shareTokenExpired } });
    // extra cleanup from E2E sub-tests
    for (const fn of uploadedFilenames) {
      const fp = path.join(process.cwd(), 'uploads', fn);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await app.close();
  });

  /* 1 GET /download/:token - metadata */
  describe(`GET /${PREFIX}/download/:token`, () => {
    it('1.1 valid token (no password) -> 200 + full meta', async () => {
      const res = await request(app.getHttpServer()).get(`/${PREFIX}/download/${shareTokenFree}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('filename');
      expect(res.body.data).toHaveProperty('size');
      expect(res.body.data).toHaveProperty('mimeType');
      expect(res.body.data).toHaveProperty('requiresPassword');
      expect(res.body.data.requiresPassword).toBe(false);
    });

    it('1.2 valid token (protected) -> requiresPassword = true', async () => {
      const res = await request(app.getHttpServer()).get(`/${PREFIX}/download/${shareTokenProtected}`);
      expect(res.status).toBe(200);
      expect(res.body.data.requiresPassword).toBe(true);
    });

    it('1.3 expired token -> 410', async () => {
      const res = await request(app.getHttpServer()).get(`/${PREFIX}/download/${shareTokenExpired}`);
      expect(res.status).toBe(410);
    });

    it('1.4 unknown token -> 404', async () => {
      const res = await request(app.getHttpServer()).get(`/${PREFIX}/download/token-qui-nexiste-pas`);
      expect(res.status).toBe(404);
    });
  });

  /* 2 POST /download/:token - download */
  describe(`POST /${PREFIX}/download/:token`, () => {
    it('2.1 file without password -> 200 + content-disposition', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/download/${shareTokenFree}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toBeDefined();
    });

    it('2.2 correct password -> 200 stream', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/download/${shareTokenProtected}`)
        .send({ password: FILE_PASSWORD });
      expect(res.status).toBe(200);
    });

    it('2.3 wrong password -> 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/download/${shareTokenProtected}`)
        .send({ password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('2.4 expired token -> 410', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/download/${shareTokenExpired}`)
        .send({});
      expect(res.status).toBe(410);
    });
  });

  /* 3 E2E - full download flows */
  describe('E2E: upload → getMeta → download', () => {
    it('3.1 free download flow (anonymous upload)', async () => {
      const upload = await request(app.getHttpServer())
        .post(`/${PREFIX}/files/anonymous`)
        .attach('file', Buffer.from('e2e download content'), { filename: 'e2e-dl.txt', contentType: 'text/plain' })
        .field('expirationDays', '7');
      expect(upload.status).toBe(201);
      const token: string = upload.body.data.shareToken;
      // track for disk cleanup
      const file = await prisma.file.findUnique({ where: { shareToken: token } });
      if (file) uploadedFilenames.push(file.filename);

      const meta = await request(app.getHttpServer()).get(`/${PREFIX}/download/${token}`);
      expect(meta.status).toBe(200);
      expect(meta.body.data.requiresPassword).toBe(false);

      const dl = await request(app.getHttpServer()).post(`/${PREFIX}/download/${token}`).send({});
      expect(dl.status).toBe(200);
    });

    it('3.2 protected download flow - correct password', async () => {
      const upload = await request(app.getHttpServer())
        .post(`/${PREFIX}/files`)
        .set('Cookie', cookie)
        .attach('file', Buffer.from('e2e protected'), { filename: 'e2e-prot.txt', contentType: 'text/plain' })
        .field('expirationDays', '7')
        .field('downloadPassword', 'E2EPass1');
      expect(upload.status).toBe(201);
      const token: string = upload.body.data.shareToken;

      const dl = await request(app.getHttpServer())
        .post(`/${PREFIX}/download/${token}`)
        .send({ password: 'E2EPass1' });
      expect(dl.status).toBe(200);
    });

    it('3.3 protected download flow - wrong password -> 401', async () => {
      const upload = await request(app.getHttpServer())
        .post(`/${PREFIX}/files`)
        .set('Cookie', cookie)
        .attach('file', Buffer.from('e2e protected2'), { filename: 'e2e-prot2.txt', contentType: 'text/plain' })
        .field('expirationDays', '7')
        .field('downloadPassword', 'E2EPass1');
      const token: string = upload.body.data.shareToken;

      const dl = await request(app.getHttpServer())
        .post(`/${PREFIX}/download/${token}`)
        .send({ password: 'WrongPass' });
      expect(dl.status).toBe(401);
    });
  });
});
