const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const code = req.query.code;
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return res.status(400).send("No code provided.");
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).send(`GitHub OAuth Error: ${data.error_description}`);
    }

    const { access_token } = data;

    // Send the token back to the CMS window
    const script = `
      <script>
        (function() {
          function registrate() {
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({ token: access_token, provider: 'github' })}',
              window.location.origin
            );
          }
          registrate();
        })();
      </script>
    `;

    res.send(script);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Internal server error.");
  }
};
