require('dotenv').config({path:'.env.local'});
const {neon} = require('@neondatabase/serverless');
const sql = neon(process.env.NEON_DATABASE_URL);
sql`INSERT INTO users (id, first_name, last_name, phone, country_code, password, role, created_at) VALUES ('admin','Admin','Hawk','ADMIN','+0','Mr.Hawk','admin', CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING`.then(() => console.log('Admin created/updated')).catch(e => console.error('DB error:', e.message));
