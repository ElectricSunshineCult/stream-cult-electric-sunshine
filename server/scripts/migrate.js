const { connectDB } = require('../config/database');
const { createTables } = require('../database/schema');
const { runSeeds } = require('../database/seeds');

const runMigrations = async () => {
  try {
    console.log('🔄 Starting database migration...');
    
    // Connect to database
    await connectDB();
    
    // Create tables
    await createTables();
    
    // Run seeds
    await runSeeds();
    
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };