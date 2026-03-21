import pkg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const STAGING_USERS = [
	{ name: 'Staging Patient', email: 'patient@staging.manas360.com', role: 'PATIENT' },
	{ name: 'Staging Therapist', email: 'therapist@staging.manas360.com', role: 'THERAPIST' },
	{ name: 'Staging Psychologist', email: 'psychologist@staging.manas360.com', role: 'PSYCHOLOGIST' },
	{ name: 'Staging Psychiatrist', email: 'psychiatrist@staging.manas360.com', role: 'PSYCHIATRIST' },
	{ name: 'Staging Coach', email: 'coach@staging.manas360.com', role: 'COACH' },
	{ name: 'Staging Admin', email: 'admin@staging.manas360.com', role: 'ADMIN' },
];

const seed = async () => {
	try {
		console.log('✅ Connecting to DB...');
		await pool.connect();

		const passwordPlain = process.env.SEED_DEFAULT_PASSWORD || 'Demo@12345';
		const hashedPassword = await bcrypt.hash(passwordPlain, 10);

		const emails = STAGING_USERS.map((u) => u.email);
		await pool.query(`DELETE FROM users WHERE email = ANY($1)`, [emails]);

		const valueClauses = STAGING_USERS.map((_, idx) => `($${idx * 4 + 1}, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4})`).join(',\n');
		const params = STAGING_USERS.flatMap((u) => [u.name, u.email, hashedPassword, u.role]);

		await pool.query(`INSERT INTO users (name, email, password, role) VALUES ${valueClauses}`, params);

		console.log('🚀 Staging seed data inserted!');
		console.log('   - password:', passwordPlain);
		process.exit(0);
	} catch (err) {
		console.error('❌ Seed error:', err);
		process.exit(1);
	} finally {
		await pool.end();
	}
};

seed();
