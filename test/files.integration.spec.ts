import * as path from 'path';
import * as fs from 'fs';
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

const TEST_EMAIL = 'integration-files@test.local';
const TEST_EMAIL_B = 'integration-files-b@test.local';
const TEST_PASSWORD = 'Password1';
const PREFIX = 'api/v1';

/* FILES INTEGRATION */
describe('Files routes (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string[];
  let cookieB: string[];
  let uploadedFileId: number;
  let anonShareToken: string;

  /* HELPERS */
  const loginAs = async (email: string): Promise<string[]> => {
    const res = await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/login`)
      .send({ email, password: TEST_PASSWORD, isMobile: false });
    return res.headers['set-cookie'] as unknown as string[];
  };

  const getFileIds = async (emails: string[]): Promise<number[]> => {
    const users = await prisma.user.findMany({ where: { email: { in: emails } } });
    const ids = users.map((u) => u.id);
    const files = await prisma.file.findMany({ where: { userId: { in: ids } } });
    return files.map((f) => f.id);
  };

  const deleteFilesFromDisk = async (fileIds: number[]): Promise<void> => {
    const files = await prisma.file.findMany({ where: { id: { in: fileIds } } });
    for (const f of files) {
      const fp = path.join(process.cwd(), 'uploads', f.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
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
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'FilesTest' });
    await request(app.getHttpServer())
      .post(`/${PREFIX}/auth/register`)
      .send({ email: TEST_EMAIL_B, password: TEST_PASSWORD, name: 'FilesTestB' });

    cookie = await loginAs(TEST_EMAIL);
    cookieB = await loginAs(TEST_EMAIL_B);
  });

  afterAll(async () => {
    // clean disk then DB (SetNull cascade: files persist after user delete)
    const fileIds = await getFileIds([TEST_EMAIL, TEST_EMAIL_B]);
    await deleteFilesFromDisk(fileIds);

    // clean anonymous file if tracked
    if (anonShareToken) {
      const anonFile = await prisma.file.findUnique({ where: { shareToken: anonShareToken } });
      if (anonFile) {
        const fp = path.join(process.cwd(), 'uploads', anonFile.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
        await prisma.file.delete({ where: { id: anonFile.id } });
      }
    }

    await prisma.file.deleteMany({ where: { userId: { in: (await prisma.user.findMany({ where: { email: { in: [TEST_EMAIL, TEST_EMAIL_B] } } })).map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, TEST_EMAIL_B] } } });
    await app.close();
  });

  /* 1 POST /files */
  describe(`POST /${PREFIX}/files`, () => {
    /* 1.1 VALID FILE */
    it('1.1 fichier valide + auth -> 201 + shareToken', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/files`)
        .set('Cookie', cookie)
        .attach('file', Buffer.from('hello world'), { filename: 'test.txt', contentType: 'text/plain' })
        .field('expirationDays', '7');

      expect(res.status).toBe(201);
      expect(res.body.data.shareToken).toBeDefined();
      expect(res.body.data.originalName).toBe('test.txt');
      expect(res.body.data.passwordProtected).toBe(false);
      uploadedFileId = res.body.data.id;
    });

    /* 1.2 NO AUTH */
    it('1.2 sans authentification -> 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/files`)
        .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });
      expect(res.status).toBe(401);
    });

    /* 1.3 FORBIDDEN EXTENSION */
    it('1.3 extension interdite (.exe) -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/files`)
        .set('Cookie', cookie)
        .attach('file', Buffer.from('MZ'), { filename: 'malware.exe', contentType: 'application/octet-stream' });
      expect(res.status).toBe(400);
    });

    /* 1.4 WITH PASSWORD */
    it('1.4 upload avec mot de passe -> 201 + passwordProtected = true', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/files`)
        .set('Cookie', cookie)
        .attach('file', Buffer.from('secured'), { filename: 'secured.txt', contentType: 'text/plain' })
        .field('expirationDays', '7')
        .field('downloadPassword', 'Secret1!');

      expect(res.status).toBe(201);
      expect(res.body.data.passwordProtected).toBe(true);
    });
  });

  /* 2 POST /files/anonymous */
  describe(`POST /${PREFIX}/files/anonymous`, () => {
    /* 2.1 VALID WITHOUT AUTH */
    it('2.1 fichier valide sans token -> 201 + shareToken', async () => {
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/files/anonymous`)
        .attach('file', Buffer.from('anonymous file'), { filename: 'anon.txt', contentType: 'text/plain' })
        .field('expirationDays', '7');

      expect(res.status).toBe(201);
      expect(res.body.data.shareToken).toBeDefined();
      anonShareToken = res.body.data.shareToken;
    });
  });

  /* 3 GET /files */
  describe(`GET /${PREFIX}/files`, () => {
    /* 3.1 AUTHENTICATED */
    it('3.1 utilisateur connecté -> 200 + tableau avec propriétés', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${PREFIX}/files`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('originalName');
      expect(res.body.data[0]).toHaveProperty('expiresAt');
      expect(res.body.data[0]).toHaveProperty('shareToken');
      expect(res.body.data[0]).toHaveProperty('tags');
    });

    /* 3.2 ISOLATION -  userB ne voit pas les fichiers de userA */
    it('3.2 isolation : userB ne voit pas les fichiers de userA', async () => {
      const resA = await request(app.getHttpServer()).get(`/${PREFIX}/files`).set('Cookie', cookie);
      const resB = await request(app.getHttpServer()).get(`/${PREFIX}/files`).set('Cookie', cookieB);
      const idsA = resA.body.data.map((f: { id: number }) => f.id);
      const idsB = resB.body.data.map((f: { id: number }) => f.id);
      expect(idsA.some((id: number) => idsB.includes(id))).toBe(false);
    });

    /* 3.3 NO AUTH */
    it('3.3 sans authentification -> 401', async () => {
      const res = await request(app.getHttpServer()).get(`/${PREFIX}/files`);
      expect(res.status).toBe(401);
    });
  });

  /* 4 DELETE /files/:id */
  describe(`DELETE /${PREFIX}/files/:id`, () => {
    /* 4.1 OTHER USER */
    it('4.1 autre utilisateur -> 403', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/${PREFIX}/files/${uploadedFileId}`)
        .set('Cookie', cookieB);
      expect(res.status).toBe(403);
    });

    /* 4.2 NOT FOUND */
    it('4.2 fichier inexistant -> 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/${PREFIX}/files/999999`)
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });

    /* 4.3 NO AUTH */
    it('4.3 sans authentification -> 401', async () => {
      const res = await request(app.getHttpServer()).delete(`/${PREFIX}/files/${uploadedFileId}`);
      expect(res.status).toBe(401);
    });

    /* 4.4 OWNER */
    it('4.4 propriétaire -> 204', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/${PREFIX}/files/${uploadedFileId}`)
        .set('Cookie', cookie);
      expect(res.status).toBe(204);
    });
  });

  /* 5 E2E -  FLUX UPLOAD + HISTORIQUE + SUPPRESSION */
  describe('E2E: login → upload → GET /files → DELETE', () => {
    it('5.1 flux complet upload + historique + suppression', async () => {
      /* upload */
      const upload = await request(app.getHttpServer())
        .post(`/${PREFIX}/files`)
        .set('Cookie', cookie)
        .attach('file', Buffer.from('e2e test'), { filename: 'e2e.txt', contentType: 'text/plain' })
        .field('expirationDays', '7');
      expect(upload.status).toBe(201);
      const fileId: number = upload.body.data.id;

      /* liste -  fichier présent */
      const list = await request(app.getHttpServer()).get(`/${PREFIX}/files`).set('Cookie', cookie);
      expect(list.status).toBe(200);
      expect(list.body.data.some((f: { id: number }) => f.id === fileId)).toBe(true);

      /* suppression */
      const del = await request(app.getHttpServer())
        .delete(`/${PREFIX}/files/${fileId}`)
        .set('Cookie', cookie);
      expect(del.status).toBe(204);

      /* liste -  fichier absent */
      const list2 = await request(app.getHttpServer()).get(`/${PREFIX}/files`).set('Cookie', cookie);
      expect(list2.body.data.some((f: { id: number }) => f.id === fileId)).toBe(false);
    });
  });
});
