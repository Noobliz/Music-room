import { resolve } from 'node:path';

import { closeDatabaseConnection } from '../src/db/client.js';
import { CATALOG_MANIFEST, importCatalog } from '../src/services/catalog-import.service.js';

const directory = resolve(process.argv[2] ?? process.env.CATALOG_DIR ?? 'catalog');
const print = (line: string) => process.stdout.write(`${line}\n`);

try {
  const report = await importCatalog(directory);
  if (!report.directoryFound) {
    print(`No catalog folder at ${directory}: nothing to import.`);
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
