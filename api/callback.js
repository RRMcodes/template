module.exports = async (req, res) => {
  const code = req.query.code;
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return res.status(400).send("Login failed: No authorization code received from GitHub.");
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
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.error) {
      return res.status(500).send(`GitHub OAuth Error: ${data.error_description || data.error}.`);
    }

    const { access_token } = data;

    if (!access_token) {
      return res.status(500).send("Login failed: GitHub did not return an access token.");
    }

    // Return HTML to handle communication with CMS window
    const script = `
      <html>
      <body style="background:#111; color:#fff; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="text-align:center; padding:20px;">
          <h3 id="status">Syncing with CMS...</h3>
          <p style="font-size:0.8rem; opacity:0.7;">This window should close automatically.</p>
        </div>
        <script>
          const tokenData = ${JSON.stringify({ token: access_token, provider: 'github' })};
          const message = 'authorization:github:success:' + JSON.stringify(tokenData);
          
          function registrate() {
            // Send to opener with a wildcard fallback if origin check fails
            window.opener.postMessage(message, "*");
            
            // Auto-close quickly
            setTimeout(() => {
              window.close();
            }, 1000);
          }

          registrate();
        </script>
      </body>
      </html>
    `;

    res.send(script);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("OAuth callback error:", error);
    res.status(500).send("Login Error: " + error.message);
  }
};
