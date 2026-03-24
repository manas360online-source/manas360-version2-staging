const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const prisma = new PrismaClient();

const STAGING_USERS = [
	{ name: 'Staging Patient', email: 'patient@staging.manas360.com', phone: '+917100100001', role: 'PATIENT' },
	{ name: 'Staging Therapist', email: 'therapist@staging.manas360.com', phone: '+917100200001', role: 'THERAPIST' },
	{ name: 'Staging Psychologist', email: 'psychologist@staging.manas360.com', phone: '+917100500001', role: 'PSYCHOLOGIST' },
	{ name: 'Staging Psychiatrist', email: 'psychiatrist@staging.manas360.com', phone: '+917100400001', role: 'PSYCHIATRIST' },
	{ name: 'Staging Coach', email: 'coach@staging.manas360.com', phone: '+917100300001', role: 'COACH' },
	{ name: 'Staging Admin', email: 'admin@staging.manas360.com', phone: '+917100600001', role: 'ADMIN' },
];

const seed = async () => {
	try {
		console.log('✅ Seeding staging users...');

		const passwordPlain = process.env.SEED_DEFAULT_PASSWORD || 'Demo@12345';
		const hashedPassword = await bcrypt.hash(passwordPlain, 10);

		for (const user of STAGING_USERS) {
			const [firstName, ...rest] = user.name.split(' ');
			const lastName = rest.join(' ') || 'User';

			await prisma.user.upsert({
				where: { email: user.email },
				update: {
					name: user.name,
					firstName,
					lastName,
					phone: user.phone,
					passwordHash: hashedPassword,
					role: user.role,
					provider: 'LOCAL',
					emailVerified: true,
					phoneVerified: true,
					isDeleted: false,
					failedLoginAttempts: 0,
					lockUntil: null,
				},
				create: {
					name: user.name,
					firstName,
					lastName,
					email: user.email,
					phone: user.phone,
					passwordHash: hashedPassword,
					role: user.role,
					provider: 'LOCAL',
					emailVerified: true,
					phoneVerified: true,
				},
			});
		}

		console.log('🚀 Staging seed data inserted!');
		console.log('   - password:', passwordPlain);
		console.log('   - user login method: phone OTP');
		console.log('   - platform admin login method: email + password');
		process.exit(0);
	} catch (err) {
		console.error('❌ Seed error:', err);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
};

seed();
