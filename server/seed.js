const fs = require('fs');
const path = require('path');
const { exec, get } = require('./db');

async function seed() {
  try {
    console.log('--- Initializing ShopEasy Database ---');
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');
    await exec(schemaSql);
    console.log('1. Schema executed successfully.');

    const seedSql = fs.readFileSync(path.resolve(__dirname, 'seed.sql'), 'utf8');
    await exec(seedSql);
    console.log('2. Seed data executed successfully.');

    const userCount = await get('SELECT COUNT(*) as count FROM users');
    const prodCount = await get('SELECT COUNT(*) as count FROM products');
    const catCount = await get('SELECT COUNT(*) as count FROM categories');
    const orderCount = await get('SELECT COUNT(*) as count FROM orders');

    console.log(`Summary:`);
    console.log(`- Categories: ${catCount.count}`);
    console.log(`- Products:   ${prodCount.count}`);
    console.log(`- Users:      ${userCount.count}`);
    console.log(`- Orders:     ${orderCount.count}`);
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
