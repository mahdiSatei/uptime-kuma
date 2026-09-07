/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const hasColumn = await knex.schema.hasColumn("user", "role");
    if (!hasColumn) {
        await knex.schema.alterTable("user", (table) => {
            // مقدار پیش‌فرض را admin می‌گذاریم تا یوزرهای موجود به مشکل دسترسی نخورند
            table.string("role", 20).defaultTo("admin").notNullable();
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    const hasColumn = await knex.schema.hasColumn("user", "role");
    if (hasColumn) {
        await knex.schema.alterTable("user", (table) => {
            table.dropColumn("role");
        });
    }
};