/**
 * Requires users table to exist.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('batches', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending',
    },
    total_items: { type: 'integer', notNull: true, default: 0 },
    completed_items: { type: 'integer', notNull: true, default: 0 },
    failed_items: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    completed_at: { type: 'timestamptz' },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.createIndex('batches', 'user_id');
  pgm.createIndex('batches', 'created_at');
  pgm.createIndex('batches', 'status');

  pgm.sql(`
    CREATE TRIGGER set_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS set_batches_updated_at ON batches;');
  pgm.dropTable('batches');
};
