module.exports = (req, res) => {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).send("Configuration Error: GITHUB_CLIENT_ID is not defined in Vercel Environment Variables.");
  }

  const scope = "repo,user";
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${scope}`;
  
  res.redirect(url);
};
