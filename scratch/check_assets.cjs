const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'dist', 'assets');
if (!fs.existsSync(assetsDir)) {
    console.error('dist/assets not found');
    process.exit(1);
}

const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
for (const file of files) {
    const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    if (content.includes('/game-planner/')) {
        console.log(`Found base path in ${file}`);
        // Print a snippet around the match
        const idx = content.indexOf('/game-planner/');
        console.log('Snippet:', content.substring(idx - 50, idx + 50));
    } else {
        console.log(`Base path NOT found in ${file}`);
    }
}
