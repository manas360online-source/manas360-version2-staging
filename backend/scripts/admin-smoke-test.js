const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const baseURL = process.env.ADMIN_SMOKE_BASE_URL || 'http://localhost:3000/api';

async function main() {
  const email = `admin-smoke-${Date.now()}@test.local`;
  const password = 'AdminSmoke@123';

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'Smoke',
      name: 'Admin Smoke',
      emailVerified: true,
      isDeleted: false,
      provider: 'LOCAL',
    },
  });

  const login = await axios.post(
    `${baseURL}/v1/auth/login`,
    { identifier: email, password },
    { validateStatus: () => true },
  );

  if (login.status !== 200) {
    throw new Error(`LOGIN_FAIL ${login.status} ${JSON.stringify(login.data)}`);
  }

  const cookies = login.headers['set-cookie'] || [];
  const accessCookie = cookies.find((c) => c.startsWith('access_token='));
  if (!accessCookie) {
    throw new Error('NO_ACCESS_COOKIE');
  }

  const accessToken = decodeURIComponent(accessCookie.split(';')[0].split('=')[1]);
  const auth = {
    headers: { Authorization: `Bearer ${accessToken}` },
    validateStatus: () => true,
  };

  const legalRequired = await axios.get(`${baseURL}/v1/auth/legal/required`, auth);
  if (legalRequired.status === 200 && legalRequired.data?.data?.legalAcceptanceRequired) {
    const ids = (legalRequired.data.data.pendingDocuments || []).map((d) => d.id);
    if (ids.length > 0) {
      const accepted = await axios.post(`${baseURL}/v1/auth/legal/accept`, { documentIds: ids }, auth);
      console.log(`legal-accept: ${accepted.status} (${ids.length} docs)`);
    }
  }

  const userEmail = `user-list-${Date.now()}@test.local`;
  await prisma.user.create({
    data: {
      email: userEmail,
      passwordHash: await bcrypt.hash('User@123456', 10),
      role: 'PATIENT',
      firstName: 'List',
      lastName: 'User',
      name: 'List User',
      emailVerified: true,
      isDeleted: false,
      provider: 'LOCAL',
    },
  });

  const checks = [];
  const addCheck = (name, status) => checks.push({ name, status });

  const get = async (name, pathName) => {
    const r = await axios.get(`${baseURL}${pathName}`, auth);
    addCheck(name, r.status);
    return r;
  };

  const users = await get('admin-users', '/v1/admin/users?page=1&limit=50');
  const usersList = users?.data?.data?.data || [];
  addCheck('user-created-visible', usersList.some((u) => u.email === userEmail) ? 200 : 500);

  const pricingBefore = await get('admin-pricing-get-before', '/v1/admin/pricing');
  if (pricingBefore.status === 200) {
    const current = Number(pricingBefore?.data?.data?.surchargePercent ?? 0);
    const changed = current === 1 ? 2 : 1;

    const patch = await axios.patch(`${baseURL}/v1/admin/pricing`, { surchargePercent: changed }, auth);
    addCheck('admin-pricing-patch', patch.status);

    const pricingAfter = await get('admin-pricing-get-after', '/v1/admin/pricing');
    const after = Number(pricingAfter?.data?.data?.surchargePercent ?? current);
    addCheck('pricing-reflects-change', after === changed ? 200 : 500);

    await axios.patch(`${baseURL}/v1/admin/pricing`, { surchargePercent: current }, auth);
  }

  await get('admin-user-approvals', '/v1/admin/user-approvals');
  await get('admin-roles', '/v1/admin/roles');
  await get('admin-audit', '/v1/admin/audit?page=1&limit=20');
  await get('admin-compliance-status', '/v1/admin/compliance/status');
  await get('admin-legal-documents', '/v1/admin/legal/documents');
  await get('admin-acceptances', '/v1/admin/acceptances');
  await get('admin-feedback', '/v1/admin/feedback');
  await get('admin-crisis-alerts', '/v1/admin/crisis/alerts');

  await get('admin-screening-templates', '/v1/admin/screening/templates');

  const createTemplate = await axios.post(
    `${baseURL}/v1/admin/screening/templates`,
    {
      key: `smoke_${Date.now()}`,
      title: 'Smoke Screening Template',
      description: 'Smoke test template',
      estimatedMinutes: 5,
      isPublic: true,
      randomizeOrder: false,
      status: 'PUBLISHED',
    },
    auth,
  );
  addCheck('admin-screening-create-template', createTemplate.status);

  const templateId = createTemplate?.data?.data?.id;
  if (templateId) {
    const addQuestion = await axios.post(
      `${baseURL}/v1/admin/screening/templates/${templateId}/questions`,
      {
        prompt: 'Over the last 2 weeks, how often have you felt down, depressed, or hopeless?',
        sectionKey: 'phq9',
        orderIndex: 1,
        isActive: true,
      },
      auth,
    );
    addCheck('admin-screening-add-question', addQuestion.status);

    const questionId = addQuestion?.data?.data?.id;
    if (questionId) {
      const addOptionA = await axios.post(
        `${baseURL}/v1/admin/screening/questions/${questionId}/options`,
        { label: 'Not at all', optionIndex: 0, points: 0 },
        auth,
      );
      const addOptionB = await axios.post(
        `${baseURL}/v1/admin/screening/questions/${questionId}/options`,
        { label: 'Several days', optionIndex: 1, points: 1 },
        auth,
      );
      addCheck('admin-screening-add-option-1', addOptionA.status);
      addCheck('admin-screening-add-option-2', addOptionB.status);
    }
  }

  console.log('\nSMOKE_RESULTS');
  for (const c of checks) {
    console.log(`${c.name}: ${c.status}`);
  }

  const failed = checks.filter((c) => c.status < 200 || c.status >= 300);
  console.log(`\nSUMMARY total=${checks.length} failed=${failed.length}`);
  if (failed.length > 0) {
    console.log('FAILED_CASES', failed);
    process.exitCode = 2;
  }

  await prisma.user.deleteMany({ where: { email: { in: [email, userEmail] } } }).catch(() => null);
}

main()
  .catch(async (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    console.error('SMOKE_ERROR', status || '', data || error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
