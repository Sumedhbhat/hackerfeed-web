// Prints SQL that replaces a preview database's rows with src/demo-data/database.
// Usage: bun scripts/demo-data-sql.ts > demo-data.sql
import { buildDemoDataSql } from "#/demo-data/seed-sql";

process.stdout.write(buildDemoDataSql());
