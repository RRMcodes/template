const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'public', 'content', 'posts');
const manifestFile = path.join(__dirname, 'public', 'content', 'posts-manifest.json');

try {
  // Ensure the directory exists
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }

  // Read all files in the directory
  const files = fs.readdirSync(postsDir);
  
  // Filter for markdown files only
  const mdFiles = files.filter(file => file.endsWith('.md'));
  
  // Write the array to posts-manifest.json
  fs.writeFileSync(manifestFile, JSON.stringify(mdFiles, null, 2));
  
  console.log(`Successfully generated posts-manifest.json with ${mdFiles.length} posts.`);
} catch (error) {
  console.error("Error generating posts manifest:", error);
  process.exit(1);
}
