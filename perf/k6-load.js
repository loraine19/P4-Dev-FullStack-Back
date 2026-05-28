/**
 * Tests de charge k6 -  P4 DataShare API
 * Outil    : k6 v2.0.0
 * Cible    : http://localhost:3000/api/v1
 * Durée    : ~90s (3 scénarios enchaînés)
 *
 * Lancer : k6 run perf/k6-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_CREDS = {
  email: 'loraine.test+auth@mail.com',
  password: 'Password123!',
  isMobile: true, // retourne access_token en JSON (mode Bearer)
};

/* MÉTRIQUES CUSTOM */
const loginDuration = new Trend('login_duration_ms', true);
const getFilesDuration = new Trend('get_files_duration_ms', true);
const uploadAnonDuration = new Trend('upload_anon_duration_ms', true);
const errorRate = new Rate('errors');

/* OPTIONS */
export const options = {
  scenarios: {
    // Scénario 1 -  GET /files authentifié : 20 VUs pendant 30s
    get_files: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      exec: 'testGetFiles',
    },
    // Scénario 2 -  Upload anonyme : 10 VUs pendant 20s
    upload_anon: {
      executor: 'constant-vus',
      vus: 10,
      duration: '20s',
      exec: 'testUploadAnon',
      startTime: '35s',
    },
    // Scénario 3 -  Flux auth complet : 5 VUs pendant 30s
    auth_flow: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'testAuthFlow',
      startTime: '60s',
    },
  },
  thresholds: {
    'get_files_duration_ms': ['p(95)<200'],
    'upload_anon_duration_ms': ['p(95)<2000'], // upload fichier + écriture disque + INSERT Prisma, normal sous 10 VUs
    'login_duration_ms': ['p(95)<500'],
    'errors': ['rate<0.05'],
    'http_req_failed': ['rate<0.05'],
  },
};

/* SETUP -  login une fois, partager le token entre VUs */
export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify(TEST_CREDS),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'setup: login 200': (r) => r.status === 200 });
  const body = JSON.parse(res.body);
  return { token: body.data.access_token };
}

/* SCÉNARIO 1 -  GET /files */
export function testGetFiles(data) {
  const res = http.get(`${BASE_URL}/files`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { name: 'GET /api/v1/files' },
  });
  getFilesDuration.add(res.timings.duration);
  const ok = check(res, { 'GET /files: 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  sleep(0.5);
}

/* SCÉNARIO 2 -  POST /files/anonymous */
export function testUploadAnon() {
  const payload = {
    file: http.file('contenu test k6 -  load test DataShare', 'k6-test.txt', 'text/plain'),
  };
  const res = http.post(`${BASE_URL}/files/anonymous`, payload, {
    tags: { name: 'POST /api/v1/files/anonymous' },
  });
  uploadAnonDuration.add(res.timings.duration);
  const ok = check(res, { 'POST /files/anonymous: 201': (r) => r.status === 201 });
  errorRate.add(!ok);
  sleep(1);
}

/* SCÉNARIO 3 -  Flux login → GET /files → logout */
export function testAuthFlow() {
  // login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify(TEST_CREDS),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /auth/login' } },
  );
  loginDuration.add(loginRes.timings.duration);
  const loginOk = check(loginRes, { 'login: 200': (r) => r.status === 200 });
  errorRate.add(!loginOk);

  if (loginOk) {
    const token = JSON.parse(loginRes.body).data.access_token;

    // GET /files
    const filesRes = http.get(`${BASE_URL}/files`, {
      headers: { Authorization: `Bearer ${token}` },
      tags: { name: 'GET /api/v1/files' },
    });
    getFilesDuration.add(filesRes.timings.duration);
    check(filesRes, { 'GET /files après login: 200': (r) => r.status === 200 });

    // logout
    http.post(`${BASE_URL}/auth/logout`, null, {
      headers: { Authorization: `Bearer ${token}` },
      tags: { name: 'POST /auth/logout' },
    });
  }

  sleep(2);
}
