const { query } = require('../config/database');

const seedRegions = async () => {
  const regions = [
    // Continents
    { name: 'North America', code: 'NA', parent_id: null, continent: 'North America' },
    { name: 'Europe', code: 'EU', parent_id: null, continent: 'Europe' },
    { name: 'Asia', code: 'AS', parent_id: null, continent: 'Asia' },
    { name: 'South America', code: 'SA', parent_id: null, continent: 'South America' },
    { name: 'Oceania', code: 'OC', parent_id: null, continent: 'Oceania' },
    { name: 'Africa', code: 'AF', parent_id: null, continent: 'Africa' },

    // Countries
    { name: 'United States', code: 'US', parent_id: 1, continent: 'North America' },
    { name: 'Canada', code: 'CA', parent_id: 1, continent: 'North America' },
    { name: 'Mexico', code: 'MX', parent_id: 1, continent: 'North America' },
    { name: 'United Kingdom', code: 'GB', parent_id: 2, continent: 'Europe' },
    { name: 'Germany', code: 'DE', parent_id: 2, continent: 'Europe' },
    { name: 'France', code: 'FR', parent_id: 2, continent: 'Europe' },
    { name: 'Japan', code: 'JP', parent_id: 3, continent: 'Asia' },
    { name: 'South Korea', code: 'KR', parent_id: 3, continent: 'Asia' },
    { name: 'China', code: 'CN', parent_id: 3, continent: 'Asia' },
    { name: 'Brazil', code: 'BR', parent_id: 4, continent: 'South America' },
    { name: 'Argentina', code: 'AR', parent_id: 4, continent: 'South America' },
    { name: 'Australia', code: 'AU', parent_id: 5, continent: 'Oceania' },
    { name: 'New Zealand', code: 'NZ', parent_id: 5, continent: 'Oceania' },
    { name: 'South Africa', code: 'ZA', parent_id: 6, continent: 'Africa' },
    { name: 'Nigeria', code: 'NG', parent_id: 6, continent: 'Africa' }
  ];

  for (const region of regions) {
    await query(
      'INSERT INTO regions (name, code, parent_id, continent) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING',
      [region.name, region.code, region.parent_id, region.continent]
    );
  }
  console.log('✅ Regions seeded');
};

const seedCategories = async () => {
  const categories = [
    { name: 'Gaming', description: 'Video games, streaming gameplay, gaming commentary', nsfw_flag: false, icon_url: '/icons/gaming.svg' },
    { name: 'News Reviews', description: 'Current events, political commentary, news analysis', nsfw_flag: false, icon_url: '/icons/news.svg' },
    { name: 'Driving', description: 'Car reviews, racing, automotive content', nsfw_flag: false, icon_url: '/icons/driving.svg' },
    { name: 'Music', description: 'Live music, music reviews, audio production', nsfw_flag: false, icon_url: '/icons/music.svg' },
    { name: 'NSFW', description: 'Adult content, 18+ only', nsfw_flag: true, icon_url: '/icons/nsfw.svg' },
    { name: 'Art', description: 'Digital art, drawing, painting, creative content', nsfw_flag: false, icon_url: '/icons/art.svg' },
    { name: 'Tech', description: 'Technology reviews, programming, tech news', nsfw_flag: false, icon_url: '/icons/tech.svg' },
    { name: 'Lifestyle', description: 'Daily life, vlogs, personal content', nsfw_flag: false, icon_url: '/icons/lifestyle.svg' }
  ];

  for (const category of categories) {
    await query(
      'INSERT INTO categories (name, description, nsfw_flag, icon_url) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
      [category.name, category.description, category.nsfw_flag, category.icon_url]
    );
  }
  console.log('✅ Categories seeded');
};

const seedAdminUser = async () => {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('admin123', 10);
  
  await query(`
    INSERT INTO users (username, email, password_hash, role, region_id, age_verified, tokens_balance)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (username) DO NOTHING
  `, ['admin', 'admin@streamcult.com', hash, 'admin', 7, true, 1000000]);
  
  console.log('✅ Admin user seeded (username: admin, password: admin123)');
};

const seedTestStreamers = async () => {
  const bcrypt = require('bcryptjs');
  const streamers = [
    {
      username: 'GameMaster99',
      email: 'gm@streamcult.com',
      role: 'streamer',
      region_id: 7,
      bio: 'Professional gamer, speedrunner, and gaming commentator',
      tokens_balance: 50000
    },
    {
      username: 'MusicMaster',
      email: 'music@streamcult.com',
      role: 'streamer',
      region_id: 2,
      bio: 'Live music production and electronic beats',
      tokens_balance: 25000
    },
    {
      username: 'TechReviewer',
      email: 'tech@streamcult.com',
      role: 'streamer',
      region_id: 7,
      bio: 'Tech reviews and programming tutorials',
      tokens_balance: 75000
    },
    {
      username: 'NSFWArtist',
      email: 'nsfw@streamcult.com',
      role: 'streamer',
      region_id: 1,
      bio: 'Adult content creator and digital artist',
      tokens_balance: 100000,
      age_verified: true
    }
  ];

  for (const streamer of streamers) {
    const hash = await bcrypt.hash('streamer123', 10);
    await query(`
      INSERT INTO users (username, email, password_hash, role, region_id, bio, tokens_balance, age_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (username) DO NOTHING
    `, [
      streamer.username,
      streamer.email,
      hash,
      streamer.role,
      streamer.region_id,
      streamer.bio,
      streamer.tokens_balance,
      streamer.age_verified || false
    ]);
  }
  console.log('✅ Test streamers seeded (password: streamer123)');
};

const runSeeds = async () => {
  try {
    await seedRegions();
    await seedCategories();
    await seedAdminUser();
    await seedTestStreamers();
    console.log('✅ All seeds completed successfully');
  } catch (error) {
    console.error('❌ Error running seeds:', error);
    throw error;
  }
};

module.exports = {
  runSeeds,
  seedRegions,
  seedCategories,
  seedAdminUser,
  seedTestStreamers
};