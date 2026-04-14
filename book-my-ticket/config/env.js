import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function validateConfig() {
  const errors = [];

  // Validate JWT_SECRET
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Validate database configuration
  if (!process.env.DB_HOST) {
    errors.push('DB_HOST environment variable is required');
  }
  if (!process.env.DB_USER) {
    errors.push('DB_USER environment variable is required');
  }
  if (!process.env.DB_PASSWORD) {
    errors.push('DB_PASSWORD environment variable is required');
  }
  if (!process.env.DB_NAME) {
    errors.push('DB_NAME environment variable is required');
  }

  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
}

// Validate configuration on module load
validateConfig();

export const config = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || '24h'
  },
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 20,
    connectionTimeoutMillis: 0,
    idleTimeoutMillis: 0
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 10
  },
  server: {
    port: parseInt(process.env.PORT) || 8080
  }
};
