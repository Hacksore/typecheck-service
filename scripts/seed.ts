import { readFileSync } from 'node:fs';
import packageJson from '../package.json';
// TODO: make this read node_modules/typescript/lib/*.d.ts and upload them to:
// R2 Bucket: typescript/<version>/libs/<libName>

// NOTE: we should share this with the worker code
const standardLibs = [
  'lib.decorators.d.ts',
  'lib.decorators.legacy.d.ts',
  'lib.d.ts',
  'lib.es5.d.ts',
  'lib.webworker.importscripts.d.ts',
  'lib.scripthost.d.ts',
  'lib.dom.d.ts',
  'lib.esnext.d.ts',
];

const typescriptVersion = packageJson.dependencies.typescript;

for (const lib of standardLibs) {
  const libCode = readFileSync(`node_modules/typescript/lib/${lib}`, 'utf8');

  // upload to the r2 Bucket
  uploadToR2({
    typescriptVersion,
    lib,
    libCode,
  });
}

function uploadToR2(arg0: { typescriptVersion: string; lib: string; libCode: string }) {
  throw new Error('Function not implemented.');
}
