# NodeJsLoginPassport

A simple username/password login system: register, log in, see a dashboard that only logged-in users can open, and log out. Built with Express 5, Passport (local strategy), Handlebars views, Bootstrap 5 and MongoDB.

## Requirements

- Node.js 20 or newer
- MongoDB running locally, or a connection string in `DATABASE_URL`

## Running it

```sh
npm install
npm start      # http://localhost:3000
```

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | |
| `DATABASE_URL` | `mongodb://127.0.0.1:27017/loginapp` | Users and sessions are both stored here. |
| `SESSION_SECRET` | random per start | **Required** when `NODE_ENV=production`. |
| `NODE_ENV` | | Set to `production` to send cookies over HTTPS only. |

## Security notes

- Passwords are hashed with bcrypt (cost 12) and must be at least 8 characters.
- Usernames are unique.
- Login gives the same message for an unknown username and a wrong password.
- Every form carries a CSRF token, logout is a POST, and the session cookie is `HttpOnly` and `SameSite=Lax`.
- Passport starts a new session on login.

## Tests

```sh
npm test
```

The tests use Vitest, Supertest and an in-memory MongoDB. CI runs them on every push.
