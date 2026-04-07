module.exports = async (req, res) => {
  const code = req.query.code;
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return res.status(400).send("Login failed: No authorization code received.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.error || !data.access_token) {
      return res.status(500).send(`GitHub OAuth Error: ${data.error_description || data.error || 'No token returned'}`);
    }

    const token = data.access_token;
    const provider = 'github';
    const tokenJSON = JSON.stringify({ token, provider });

    // Correct Decap CMS two-way handshake protocol:
    // 1. The popup listens for "authorizing:github" from the opener (CMS)
    // 2. The popup responds with the token
    // 3. The popup closes
    const html = `
<!DOCTYPE html>
<html>
<head><title>Authenticating...</title></head>
<body style="background:#0d1117;color:#c9d1d9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:1rem;">
  <div style="font-size:1.2rem;font-weight:600;">Authentication Successful</div>
  <div style="font-size:0.85rem;opacity:0.6;">Completing login, this window will close automatically...</div>
  <script>
    (function() {
      var provider = 'github';
      var tokenData = ${tokenJSON};

      // Decap CMS sends "authorizing:github" first — we respond with the token
      function receiveMessage(e) {
        console.log('[OAuth] Message from parent:', e.data, 'origin:', e.origin);
        if (e.data === 'authorizing:' + provider) {
          var msg = 'authorization:' + provider + ':success:' + JSON.stringify(tokenData);
          console.log('[OAuth] Sending token back to CMS');
          window.opener.postMessage(msg, e.origin);
          window.removeEventListener('message', receiveMessage, false);
          setTimeout(function() { window.close(); }, 1000);
        }
      }

      window.addEventListener('message', receiveMessage, false);

      // Signal to the parent that we are ready and waiting
      console.log('[OAuth] Callback ready, notifying parent...');
      window.opener.postMessage('authorizing:' + provider, '*');
    })();
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    clearTimeout(timeoutId);
    res.status(500).send("Login Error: " + error.message);
  }
};
