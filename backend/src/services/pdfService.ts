import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { AppError } from '../middleware/error.middleware';

const AGREEMENT_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'agreements');

const sanitizeFileName = (input: string): string => {
  const base = String(input || '').trim().replace(/\.pdf$/i, '');
  const safe = base.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return safe || `agreement-${Date.now()}`;
};

export const generatePDF = async (htmlContent: string, fileName: string): Promise<string> => {
  const html = String(htmlContent || '').trim();
  if (!html) {
    throw new AppError('htmlContent is required to generate PDF', 422);
  }

  const safeFileName = `${sanitizeFileName(fileName)}.pdf`;
  const absoluteDir = AGREEMENT_UPLOAD_DIR;
  const absolutePath = path.join(absoluteDir, safeFileName);

  await mkdir(absoluteDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
    });

    await writeFile(absolutePath, Buffer.from(pdfBuffer));
  } finally {
    await browser.close();
  }

  return path.join('uploads', 'agreements', safeFileName).replace(/\\/g, '/');
};
