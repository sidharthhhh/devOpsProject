-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create seats table
CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    isbooked INT DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    booked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seats_user_id ON seats(user_id);

-- Insert initial seats
INSERT INTO seats (isbooked)
SELECT 0 FROM generate_series(1, 20)
ON CONFLICT DO NOTHING;
