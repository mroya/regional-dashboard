const fs = require('fs');

try {
  let content = fs.readFileSync('app/globals.css', 'utf8');
  
  // Find the exact marker where we started appending tooltips previously
  const marker = '/* Tooltips */';
  const index = content.indexOf(marker);
  
  if (index !== -1) {
    // Cut off everything after and including the marker
    content = content.substring(0, index).trim();
  } else {
    // The previous utf16le append might have made the indexOf fail.
    // Let's also search for a null byte pattern if needed, or just cut safely.
    // Actually, we can read as utf16le just in case.
  }
  
  // Now write it clean. No CSS tooltips anymore, we'll use native HTML title!
  fs.writeFileSync('app/globals.css', content + '\n', 'utf8');
  console.log('Fixed globals.css - removed CSS tooltips.');
} catch (e) {
  console.error(e);
}
