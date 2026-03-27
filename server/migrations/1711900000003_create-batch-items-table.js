/**
 * Requires batches table to exist.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable("batch_items", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    batch_id: {
      type: "uuid",
      notNull: true,
      references: "batches",
      onDelete: "CASCADE",
    },
    input_type: { type: "varchar(10)", notNull: true },
    input_url: { type: "text" },
    input_text: { type: "text" },
    status: {
      type: "varchar(50)",
      notNull: true,
      default: "queued",
    },
    classification: { type: "jsonb" },
    entities: { type: "jsonb" },
    tags: { type: "text[]", default: pgm.func("'{}'::text[]") },
    summary: { type: "text" },
    error: { type: "text" },
    attempts: { type: "integer", notNull: true, default: 0 },
    processed_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", default: pgm.func("NOW()") },
    updated_at: { type: "timestamptz", default: pgm.func("NOW()") },
  });

  pgm.createIndex("batch_items", "batch_id");
  pgm.createIndex("batch_items", "status");
  pgm.createIndex("batch_items", ["batch_id", "status"]);

  pgm.sql(`
    CREATE TRIGGER set_batch_items_updated_at BEFORE UPDATE ON batch_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  pgm.sql("DROP TRIGGER IF EXISTS set_batch_items_updated_at ON batch_items;");
  pgm.dropTable("batch_items");
};
