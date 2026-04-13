const fs = require('fs');

function transformFile(filePath, is3D = false) {
  console.log(`Transforming ${filePath}...`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const transformed = data.map(s => {
    if (s.position) {
      const coords = s.position;
      const y = coords[0];
      const x = coords[1];
      const z = coords[2] || 0;

      if (is3D) {
        s.geom = { type: 'Point', coordinates: `POINT Z (${x} ${y} ${z})` };
      } else {
        s.geom = { type: 'Point', coordinates: `POINT(${x} ${y})` };
      }
      delete s.position;
    }
    if (s.type === 'position') {
      delete s.type;
    }
    return s;
  });
  fs.writeFileSync(filePath, JSON.stringify(transformed, null, 2));
  console.log(`Done ${filePath}`);
}

transformFile('c:\\Dev\\game-planner\\public\\data\\heartopia\\spawns.json', false);
transformFile('c:\\Dev\\game-planner\\public\\data\\satisfactory\\spawns.json', true);
