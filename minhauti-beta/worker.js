const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function validUsername(value) {
  return /^[a-z0-9._-]{3,32}$/.test(value);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function safeOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  return !origin || origin === env.PUBLIC_ORIGIN;
}

function forwardedIp(request) {
  return request.headers.get("CF-Connecting-IP") || "";
}

async function adminRest(env, path) {
  return fetch(`${env.SUPABASE_URL}${path}`, {
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Accept: "application/json",
    },
  });
}

async function publicAuth(env, path, body, request) {
  const headers = {
    "Content-Type": "application/json",
    apikey: env.SUPABASE_PUBLISHABLE_KEY,
  };

  const ip = forwardedIp(request);
  if (ip) {
    headers["Sb-Forwarded-For"] = ip;
  }

  return fetch(`${env.SUPABASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
}

async function login(request, env) {
  const body = await request.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");

  if (!validUsername(username) || !password) {
    return json({ error: "Usuário ou senha inválidos." }, 401);
  }

  const params = new URLSearchParams({
    username: `eq.${username}`,
    select: "email,active",
    limit: "1",
  });

  const profileResponse = await adminRest(
    env,
    `/rest/v1/profiles?${params.toString()}`
  );

  if (!profileResponse.ok) {
    console.error("profile_lookup_failed", profileResponse.status);
    return json({ error: "Usuário ou senha inválidos." }, 401);
  }

  const rows = await profileResponse.json();
  const profile = Array.isArray(rows) ? rows[0] : null;

  if (!profile || profile.active === false) {
    return json({ error: "Usuário ou senha inválidos." }, 401);
  }

  const authResponse = await publicAuth(
    env,
    "/auth/v1/token?grant_type=password",
    {
      email: profile.email,
      password,
    },
    request
  );

  if (!authResponse.ok) {
    return json({ error: "Usuário ou senha inválidos." }, 401);
  }

  const data = await authResponse.json();

  return json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
  });
}

async function signup(request, env) {
  const body = await request.json().catch(() => ({}));

  const email = String(body.email || "").trim().toLowerCase();
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");
  const acceptedTerms = body.acceptedTerms === true;

  if (!acceptedTerms) {
    return json(
      { error: "É necessário concordar com as Políticas de uso." },
      400
    );
  }

  if (!validEmail(email)) {
    return json({ error: "Informe um e-mail válido." }, 400);
  }

  if (!validUsername(username)) {
    return json(
      {
        error:
          "O usuário deve ter 3 a 32 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.",
      },
      400
    );
  }

  if (password.length < 8) {
    return json(
      { error: "A senha deve ter pelo menos 8 caracteres." },
      400
    );
  }

  const params = new URLSearchParams({
    username: `eq.${username}`,
    select: "id",
    limit: "1",
  });

  const check = await adminRest(
    env,
    `/rest/v1/profiles?${params.toString()}`
  );

  if (check.ok) {
    const rows = await check.json();

    if (Array.isArray(rows) && rows.length) {
      return json(
        { error: "Este nome de usuário já está em uso." },
        409
      );
    }
  }

  const redirectTo =
    `${env.PUBLIC_ORIGIN}/auth/login.html`;

  const authResponse = await publicAuth(
    env,
    `/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      email,
      password,
      data: {
        username,
        terms_accepted_at: new Date().toISOString(),
      },
    },
    request
  );

  const rawText = await authResponse.text();

  console.error(
    "supabase_signup_response",
    "status:",
    authResponse.status,
    "statusText:",
    authResponse.statusText,
    "body:",
    rawText
  );

  if (!authResponse.ok) {
    let parsed = {};

    try {
      parsed = JSON.parse(rawText);
    } catch {}

    const detail = String(
      parsed.msg ||
      parsed.message ||
      parsed.error_description ||
      parsed.error ||
      rawText ||
      "Resposta vazia"
    );

    if (/already|registered|exists/i.test(detail)) {
      return json(
        {
          error:
            "Já existe uma conta vinculada a este e-mail.",
        },
        409
      );
    }

    return json(
      {
        error:
          `Supabase HTTP ${authResponse.status}: ${detail}`,
      },
      400
    );
  }

  return json(
    {
      ok: true,
      message:
        "Conta criada. Verifique seu e-mail para confirmar o cadastro.",
    },
    201
  );
}

async function recover(request, env) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();

  if (validEmail(email)) {
    const redirectTo =
      `${env.PUBLIC_ORIGIN}/auth/redefinir-senha.html`;

    await publicAuth(
      env,
      `/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      { email },
      request
    ).catch(() => null);
  }

  return json({
    ok: true,
    message:
      "Se existir uma conta vinculada a este e-mail, as instruções de recuperação serão enviadas.",
  });
}

async function handleApi(request, env) {
  if (!safeOrigin(request, env)) {
    return json(
      { error: "Origem não autorizada." },
      403
    );
  }

  const url = new URL(request.url);

  if (request.method !== "POST") {
    return json(
      { error: "Método não permitido." },
      405
    );
  }

  if (!env.SUPABASE_SECRET_KEY) {
    console.error(
      "SUPABASE_SECRET_KEY is not configured"
    );

    return json(
      {
        error:
          "Autenticação ainda não configurada no servidor.",
      },
      503
    );
  }

  try {
    if (url.pathname === "/api/auth/login") {
      return await login(request, env);
    }

    if (url.pathname === "/api/auth/signup") {
      return await signup(request, env);
    }

    if (url.pathname === "/api/auth/recover") {
      return await recover(request, env);
    }

    return json(
      { error: "Rota não encontrada." },
      404
    );
  } catch (err) {
    console.error(
      "auth_api_error",
      err?.stack ||
      err?.message ||
      err
    );

    return json(
      {
        error:
          "Não foi possível concluir a operação.",
      },
      500
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
