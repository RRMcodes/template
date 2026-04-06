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
      <head><title>Logging you in...</title></head>
      <body style="background:#111; color:#fff; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="text-align:center; padding:20px;">
          <h3 id="status">Syncing with CMS...</h3>
          <p id="sub-status" style="font-size:0.8rem; opacity:0.7;">Handshaking with the main window.</p>
          <div id="debug" style="display:none; margin-top:20px; font-family:monospace; font-size:0.7rem; color:#888;"></div>
        </div>
        <script>
          const tokenData = ${JSON.stringify({ token: access_token, provider: 'github' })};
          const message = 'authorization:github:success:' + JSON.stringify(tokenData);
          
          function registrate() {
            const debugEl = document.getElementById('debug');
            debugEl.style.display = 'block';
            
            if (!window.opener) {
              debugEl.innerText = "Error: window.opener is missing. Ensure your browser isn't blocking popups.";
              document.getElementById('status').innerText = 'Handshake Failed';
              document.getElementById('sub-status').innerText = 'Please check your popup settings.';
              return;
            }

            try {
              // Try wildcard first to ensure it reaches, then try explicit location
              window.opener.postMessage(message, "*");
              document.getElementById('status').innerText = 'Success!';
              document.getElementById('sub-status').innerText = 'Closing now...';
              setTimeout(() => window.close(), 1000);
            } catch (e) {
              debugEl.innerText = "Error: " + e.message;
            }
          }

          // Delay for a moment to let the browser stabilize
          setTimeout(registrate, 500);
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
