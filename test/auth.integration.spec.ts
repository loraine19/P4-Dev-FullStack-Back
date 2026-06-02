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

// test user isolated from real data by unique email
const TEST_EMAIL = 'integration-auth@test.local';
const TEST_PASSWORD = 'Password1';
const TEST_NAME = 'Integration';
const PREFIX = 'api/v1';

/* AUTH INTEGRATION */
describe('Auth routes (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // bootstrap the full NestJS app -- same config as main.ts
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
    // remove any leftover test user before the suite starts
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  });

  afterAll(async () => {
    // clean up test user then close app
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await app.close();
  });

  /*1 REGISTER */
  describe(`POST /${PREFIX}/auth/register`, () => {
    /* 1.1 EMAIL AVAILABLE */
    it('1.1 email available -> 201 + message', async () => {
      /* Act */
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/auth/register`)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      /* Assert */
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Compte créé avec succès');
    });

    /* 1.2 EMAIL NOT AVAILABLE */
    it('1.2 email not available -> 409', async () => {
      /* Act & Assert */
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/auth/register`)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      expect(res.status).toBe(409);
    });

    /* 1.3 INVALID DTO PASSWORD */
    it('1.3 password too short -> 400', async () => {
      /* Act & Assert */
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/auth/register`)
        .send({ email: `invalid-email`, password: 'short', name: 'X' });
      expect(res.status).toBe(400);
    });
  });


  /*2 LOGIN */
  describe(`POST /${PREFIX}/auth/login`, () => {
   
    /* 2.1 SUCCES WEB */
    it('2.1 web success -> 200, Set-Cookie present, no access_token in body', async () => {
      /* Act */
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/auth/login`)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, isMobile: false });
      /* Assert */
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Connexion réussie');
      // cookie httpOnly set by setAuthCookie()
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.body.data?.access_token).toBeUndefined();
    });

    /* 2.2 SUCCES MOBILE */
    it('2.2 mobile success -> 200, access_token in body, no cookie', async () => {
      /* Act */
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/auth/login`)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, isMobile: true });
      /* Assert */
      expect(res.status).toBe(200);
      expect(res.body.data.access_token).toBeDefined();
      // no access_token cookie should be set in mobile mode
      const cookies = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : [];
      expect(cookies.some((c: string) => c.startsWith('access_token'))).toBe(false);
    });
  });

     /* 2.3 WRONG PASSWORD */
    it('2.3 wrong password -> 401', async () => {
      /* Act & Assert */
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/auth/login`)
        .send({ email: TEST_EMAIL, password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

   /* 2.4 UNKNOWN USER */
    it('2.4 unknown user -> 401', async () => {
      /* Act & Assert */
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/auth/login`)
        .send({ email: 'nobody@test.local', password: TEST_PASSWORD });
      expect(res.status).toBe(401);
    });


  /*3 LOGOUT */
  describe(`POST /${PREFIX}/auth/logout`, () => {

    /* 3.1 WITH TOKEN */
    it('3.1 with valid token -> 200', async () => {
      /* Arrange */
      // login first to get a valid httpOnly cookie
      const login = await request(app.getHttpServer())
        .post(`/${PREFIX}/auth/login`)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, isMobile: false });
      const cookie = login.headers['set-cookie'];
      /* Act */
      const res = await request(app.getHttpServer())
        .post(`/${PREFIX}/auth/logout`)
        .set('Cookie', cookie);
      /* Assert */
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Déconnexion réussie');
    });
     /* 3.2 WITHOUT TOKEN */
    it('3.2 without token -> 401', async () => {
      /* Act & Assert */
      const res = await request(app.getHttpServer()).post(`/${PREFIX}/auth/logout`);
      expect(res.status).toBe(401);
    });
  });
});
