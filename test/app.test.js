import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app';
import User from '../models/user';

const config = { sessionSecret: 'test-secret', isProduction: false };

/** Pulls the CSRF token out of a rendered form. */
const csrfFrom = (html) => /name="_csrf" value="([^"]+)"/.exec(html)?.[1];

async function formToken(agent, path) {
  const res = await agent.get(path);
  return csrfFrom(res.text);
}

describe('pages that need no database', () => {
  const app = createApp(config);

  it('renders the login and register pages with a CSRF token', async () => {
    const login = await request(app).get('/users/login');
    expect(login.status).toBe(200);
    expect(login.text).toContain('Account Login');
    expect(csrfFrom(login.text)).toMatch(/^[0-9a-f]{48}$/);
    expect((await request(app).get('/users/register')).text).toContain('Confirm Password');
  });

  it('serves the stylesheet the layout links to', async () => {
    const res = await request(app).get('/css/style.css');
    expect(res.status).toBe(200);
  });

  it('redirects the dashboard to login when logged out', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/users/login');
  });

  it('rejects POSTs without a valid CSRF token', async () => {
    const agent = request.agent(app);
    await agent.get('/users/login');
    const res = await agent.post('/users/login').type('form').send({ username: 'a', password: 'b', _csrf: 'nope' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown pages', async () => {
    expect((await request(app).get('/nope')).status).toBe(404);
  });
});

let mongo;
try {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongo = await MongoMemoryServer.create();
} catch (err) {
  if (process.env.CI) throw err;
  console.warn(`Skipping database tests: ${err.message}`);
}

describe.skipIf(!mongo)('register, login and logout', () => {
  const app = createApp(config);
  const alice = { name: 'Alice', email: 'alice@example.com', username: 'alice', password: 'password123', password2: 'password123' };

  beforeAll(async () => {
    await mongoose.connect(mongo.getUri());
    await User.syncIndexes();
  });
  beforeEach(() => User.deleteMany({}));
  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  async function register(agent, fields = alice) {
    const _csrf = await formToken(agent, '/users/register');
    return agent.post('/users/register').type('form').send({ ...fields, _csrf });
  }

  async function login(agent, username = 'alice', password = 'password123') {
    const _csrf = await formToken(agent, '/users/login');
    return agent.post('/users/login').type('form').send({ username, password, _csrf });
  }

  it('registers, logs in, shows the dashboard and logs out', async () => {
    const agent = request.agent(app);
    const reg = await register(agent);
    expect(reg.status).toBe(302);
    expect(reg.headers.location).toBe('/users/login');
    expect((await agent.get('/users/login')).text).toContain('You are registered and can now log in');

    const res = await login(agent);
    expect(res.headers.location).toBe('/');
    const dash = await agent.get('/');
    expect(dash.status).toBe(200);
    expect(dash.text).toContain('Welcome to your dashboard, Alice.');

    const _csrf = csrfFrom(dash.text);
    const out = await agent.post('/users/logout').type('form').send({ _csrf });
    expect(out.headers.location).toBe('/users/login');
    expect((await agent.get('/')).status).toBe(302);
  });

  it('hashes the password', async () => {
    await register(request.agent(app));
    const user = await User.findOne({ username: 'alice' });
    expect(user.password).toMatch(/^\$2[aby]\$/);
  });

  it('shows validation errors and keeps the entered values', async () => {
    const res = await register(request.agent(app), { ...alice, email: 'bad', password2: 'different' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('Email is not valid');
    expect(res.text).toContain('Passwords do not match');
    expect(res.text).toContain('value="alice"');
    expect(res.text).not.toContain('password123');
  });

  it('rejects a duplicate username', async () => {
    await register(request.agent(app));
    const res = await register(request.agent(app));
    expect(res.status).toBe(400);
    expect(res.text).toContain('That username is already taken');
    expect(await User.countDocuments()).toBe(1);
  });

  it('gives the same message for an unknown user and a wrong password', async () => {
    await register(request.agent(app));
    for (const [u, p] of [['alice', 'wrong-password'], ['nobody', 'password123']]) {
      const agent = request.agent(app);
      const res = await login(agent, u, p);
      expect(res.headers.location).toBe('/users/login');
      expect((await agent.get('/users/login')).text).toContain('Invalid username or password');
    }
  });

  it('escapes user input in pages', async () => {
    const agent = request.agent(app);
    await register(agent, { ...alice, name: '<script>alert(1)</script>' });
    await login(agent);
    const dash = await agent.get('/');
    expect(dash.text).not.toContain('<script>alert(1)</script>');
    expect(dash.text).toContain('&lt;script&gt;');
  });
});
