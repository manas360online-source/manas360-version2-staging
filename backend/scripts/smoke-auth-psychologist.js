const http = require('http');

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode, body: parsed, raw, headers: res.headers });
        });
      },
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  const login = await request('POST', '/api/auth/login', {
    identifier: 'psychologist@demo.com',
    password: 'Demo@12345',
  });

  const setCookieHeader = login.headers && login.headers['set-cookie'] ? login.headers['set-cookie'] : [];
  const cookieHeader = Array.isArray(setCookieHeader)
    ? setCookieHeader.map((value) => String(value).split(';')[0]).join('; ')
    : '';

  console.log('login_status=' + login.status);
  console.log('login_success=' + Boolean(login.body && login.body.success));
  console.log('login_user=' + ((login.body && login.body.data && login.body.data.user && login.body.data.user.email) || ''));
  console.log('login_role=' + ((login.body && login.body.data && login.body.data.user && login.body.data.user.role) || ''));

  console.log('cookie_present=' + Boolean(cookieHeader));

  if (!cookieHeader) {
    console.log('cookie_missing=true');
    process.exit(1);
  }

  const authHeader = { Cookie: cookieHeader };

  const me = await request('GET', '/api/auth/me', null, authHeader);
  console.log('me_status=' + me.status);
  console.log('me_success=' + Boolean(me.body && me.body.success));

  const dash = await request('GET', '/api/v1/psychologist/me/dashboard', null, authHeader);
  console.log('dash_status=' + dash.status);
  console.log('dash_success=' + Boolean(dash.body && dash.body.success));
  console.log('dash_keys=' + Object.keys((dash.body && dash.body.data) || {}).slice(0, 8).join(','));
}

run().catch((error) => {
  console.error('smoke_failed', error && error.message ? error.message : error);
  process.exit(1);
});
