import fs from 'fs';
import pngToIco from 'png-to-ico';

console.log('Converting icon...');
pngToIco('electron/icon.png')
    .then(buf => {
        fs.writeFileSync('electron/icon.ico', buf);
        console.log('Done: electron/icon.ico created');
    })
    .catch(console.error);
