import 'dotenv/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import path from 'node:path';
import packageJson from '../package.json';

const { ACCOUNT_ID = '', ACCESS_KEY_ID = '', SECRET_ACCESS_KEY = '' } = process.env;

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

import { readFileSync } from 'node:fs';
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

for (const name of standardLibs) {
  const libPath = path.resolve(`./node_modules/typescript/lib/${name}`);
  const code = readFileSync(libPath, 'utf8');

  // upload to the r2 Bucket
  uploadToR2({
    typescriptVersion,
    name,
    code,
  });
}

async function uploadToR2(lib: { typescriptVersion: string; name: string; code: string }) {
  console.log(`uploading to r2, ${lib.name}`);

  const command = new PutObjectCommand({
    Bucket: 'typedefs',
    Key: `typescript/v${typescriptVersion}/${lib.name}`,
    Body: lib.code,
  });

  try {
    const response = await client.send(command);
    console.log(`auccessfully uploaded ${lib.name} to r2`, response.$metadata.cfId);
  } catch (err) {
    console.error(err);
  }
}
