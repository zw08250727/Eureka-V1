// Run with qrcode available on NODE_PATH; no runtime QR service or app dependency.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const QR = createRequire(import.meta.url)('qrcode');
async function main() {
  for (const [market, url] of [['wisenote','https://www.100wiser.com/wisenote'],['eurekamind','https://eurekamind.ai/download']]) {
    await QR.toFile(fileURLToPath(new URL(`../public/brand/${market}-download-qr.svg`, import.meta.url)), url,
      {type:'svg',errorCorrectionLevel:'M',margin:4,width:256,color:{dark:'#18181b',light:'#ffffff'}});
    console.log(`${market}: ${url}`);
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
