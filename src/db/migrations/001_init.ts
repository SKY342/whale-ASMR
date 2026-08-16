/**
 * 数据库迁移占位目录。
 * 当前所有表结构集中在 schema.ts 的 initDatabase() 中（幂等 CREATE TABLE IF NOT EXISTS）。
 * 后续结构变更请在此目录新增迁移文件，并在 initDatabase 中按顺序执行。
 */
export const MIGRATION_001_INIT = '001_init';
