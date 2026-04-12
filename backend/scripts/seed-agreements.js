const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const template = await prisma.agreementTemplate.upsert({
    where: { template_name: 'Corporate Master Service Agreement' },
    update: {
      template_type: 'corporate',
      template_html: '<h1>Corporate Agreement</h1><p>Partner: {{partner_name}}</p>',
      template_variables: ['partner_name'],
      is_active: true,
    },
    create: {
      template_name: 'Corporate Master Service Agreement',
      template_type: 'corporate',
      template_html: '<h1>Corporate Agreement</h1><p>Partner: {{partner_name}}</p>',
      template_variables: ['partner_name'],
      description: 'Seed template for corporate agreement dashboard testing',
      version: '1.0',
      is_active: true,
    },
  });

  const rows = [
    {
      agreement_number: 'MANAS360-CORP-2026-101',
      agreement_type: 'master_service_agreement',
      partner_name: 'TechCorp India',
      partner_type: 'corporate',
      partner_contact_name: 'Rohan Sharma',
      partner_contact_email: 'rohan.sharma@techcorp.example',
      partner_contact_phone: '+919900000101',
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-12-31T00:00:00.000Z'),
      annual_value: 1500000,
      payment_terms: 'Net 30',
      billing_cycle: 'quarterly',
      template_data: { partner_name: 'TechCorp India' },
      generated_pdf_path: '/uploads/agreements/MANAS360-CORP-2026-101.pdf',
      status: 'active',
      signature_status: 'signed',
    },
    {
      agreement_number: 'MANAS360-CORP-2026-102',
      agreement_type: 'employee_wellbeing_program',
      partner_name: 'FinAxis Solutions',
      partner_type: 'corporate',
      partner_contact_name: 'Neha Gupta',
      partner_contact_email: 'neha.gupta@finaxis.example',
      partner_contact_phone: '+919900000102',
      start_date: new Date('2026-02-01T00:00:00.000Z'),
      end_date: new Date('2027-01-31T00:00:00.000Z'),
      annual_value: 980000,
      payment_terms: 'Net 15',
      billing_cycle: 'monthly',
      template_data: { partner_name: 'FinAxis Solutions' },
      generated_pdf_path: '/uploads/agreements/MANAS360-CORP-2026-102.pdf',
      status: 'active',
      signature_status: 'sent',
    },
    {
      agreement_number: 'MANAS360-CORP-2026-103',
      agreement_type: 'pilot_program',
      partner_name: 'BrightLearn School Network',
      partner_type: 'school',
      partner_contact_name: 'Arjun Menon',
      partner_contact_email: 'arjun.menon@brightlearn.example',
      partner_contact_phone: '+919900000103',
      start_date: new Date('2026-03-15T00:00:00.000Z'),
      end_date: new Date('2026-09-15T00:00:00.000Z'),
      annual_value: 450000,
      payment_terms: 'Advance 50%',
      billing_cycle: 'biannual',
      template_data: { partner_name: 'BrightLearn School Network' },
      generated_pdf_path: '/uploads/agreements/MANAS360-CORP-2026-103.pdf',
      status: 'draft',
      signature_status: 'draft',
    },
  ];

  for (const row of rows) {
    await prisma.institutionalAgreement.upsert({
      where: { agreement_number: row.agreement_number },
      update: {
        template_id: template.id,
        agreement_type: row.agreement_type,
        partner_name: row.partner_name,
        partner_type: row.partner_type,
        partner_contact_name: row.partner_contact_name,
        partner_contact_email: row.partner_contact_email,
        partner_contact_phone: row.partner_contact_phone,
        start_date: row.start_date,
        end_date: row.end_date,
        annual_value: row.annual_value,
        payment_terms: row.payment_terms,
        billing_cycle: row.billing_cycle,
        template_data: row.template_data,
        generated_pdf_path: row.generated_pdf_path,
        status: row.status,
        signature_status: row.signature_status,
      },
      create: {
        template_id: template.id,
        agreement_number: row.agreement_number,
        agreement_type: row.agreement_type,
        partner_name: row.partner_name,
        partner_type: row.partner_type,
        partner_contact_name: row.partner_contact_name,
        partner_contact_email: row.partner_contact_email,
        partner_contact_phone: row.partner_contact_phone,
        start_date: row.start_date,
        end_date: row.end_date,
        annual_value: row.annual_value,
        payment_terms: row.payment_terms,
        billing_cycle: row.billing_cycle,
        template_data: row.template_data,
        generated_pdf_path: row.generated_pdf_path,
        status: row.status,
        signature_status: row.signature_status,
      },
    });
  }

  const seeded = await prisma.institutionalAgreement.findMany({
    where: {
      agreement_number: {
        in: rows.map((row) => row.agreement_number),
      },
    },
    select: {
      agreement_number: true,
      partner_name: true,
      status: true,
      signature_status: true,
    },
    orderBy: { agreement_number: 'asc' },
  });

  console.log('Seeded agreements:');
  console.table(seeded);
}

main()
  .catch((error) => {
    console.error('Agreement seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
