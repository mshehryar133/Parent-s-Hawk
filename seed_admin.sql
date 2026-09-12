UPDATE users SET role = 'admin', first_name = 'Admin', last_name = 'Hawk', password = 'Mr.Hawk', phone = 'ADMIN' WHERE id = 'admin';
INSERT INTO users (id, first_name, last_name, phone, country_code, password, role, created_at) VALUES ('admin','Admin','Hawk','ADMIN','+0','Mr.Hawk','admin', CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;
