import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { closeDatabaseConnection } from '../src/db/client.js';
import { CATALOG_MANIFEST, importCatalog } from '../src/services/catalog-import.service.js';

const directory = resolve(process.argv[2] ?? process.env.CATALOG_DIR ?? 'catalog');
const print = (line: string) => process.stdout.write(`${line}\n`);

try {
  await mkdir(directory, { recursive: true });
  const report = await importCatalog(directory);
  const total = report.imported.length + report.updated.length + report.failed.length;
  if (total === 0) {
    print(`No MP3 file in ${directory}: nothing to import.`);
    print(`Put the MP3 files, their covers and an optional ${CATALOG_MANIFEST} there.`);
  } else {
    for (const { file, reason } of report.failed) {
      print(`  failed  ${file}: ${reason}`);
    }
    print(
      `${report.imported.length} imported, ${report.updated.length} updated, ${report.failed.length} failed (${directory})`,
    );
  }
  process.exitCode = report.failed.length > 0 ? 1 : 0;
} finally {
  await closeDatabaseConnection();
}
