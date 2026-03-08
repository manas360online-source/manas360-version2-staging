import type { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
  bulkUploadCorporateEmployees,
  createCorporateCampaign,
  createCorporatePaymentMethod,
  createCorporateProgram,
  createCorporateWorkshop,
  getCorporateCompanies,
  getCorporateCampaigns,
  getCorporateDashboard,
  getCorporateEmployees,
  getCorporateInvoices,
  getCorporatePaymentMethods,
  getCorporatePrograms,
  getCorporateReports,
  getCorporateRoi,
  getCorporateSessionAllocations,
  getCorporateSettings,
  getCorporateWorkshops,
  updateCorporatePaymentMethod,
  updateCorporateSessionAllocations,
  updateCorporateSettings,
} from '../services/corporate.service';

const resolveCompanyKey = (req: Request): string | undefined => {
  const raw = req.query.companyKey;
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.trim();
  return normalized || undefined;
};

export const getCorporateDashboardController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporateDashboard(companyKey);
  sendSuccess(res, data, 'Corporate dashboard retrieved successfully');
};

const parseCsvRows = (content: string): Array<Record<string, string>> => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const header = lines[0].split(',').map((item) => item.trim().toLowerCase());
  const rows = lines.slice(1);

  return rows.map((line) => {
    const cells = line.split(',').map((item) => item.trim());
    const row: Record<string, string> = {};
    header.forEach((key, index) => {
      row[key] = cells[index] || '';
    });
    return row;
  });
};

const normalizeHeaderKey = (value: string): string => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

const parseSpreadsheetRows = (buffer: Buffer): Array<Record<string, string>> => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Array<Record<string, unknown>>;

  return jsonRows.map((row) => {
    const normalized: Record<string, string> = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      normalized[normalizeHeaderKey(key)] = String(value ?? '').trim();
    });
    return normalized;
  });
};

export const listCorporateCompaniesController = async (_req: Request, res: Response): Promise<void> => {
  const data = await getCorporateCompanies();
  sendSuccess(res, data, 'Corporate companies retrieved successfully');
};

export const bulkUploadCorporateEmployeesController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  let rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

  const uploadFile = req.file;
  if ((!rows || !rows.length) && uploadFile?.buffer) {
    const fileName = String(uploadFile.originalname || '').toLowerCase();
    const parsed = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
      ? parseSpreadsheetRows(uploadFile.buffer)
      : parseCsvRows(uploadFile.buffer.toString('utf-8'));

    rows = parsed.map((row) => ({
      employeeId: row.emp_id || row.employee_id || row.employeeid || row.employee_code || '',
      name: row.name || '',
      email: row.email || '',
      department: row.department || 'General',
      location: row.location || 'Bengaluru',
      manager: row.manager || row.manager_name || row.reporting_manager || 'Unassigned',
    }));
  }

  if (!rows.length) {
    throw new AppError('rows must be a non-empty array', 400);
  }

  const result = await bulkUploadCorporateEmployees(rows, companyKey);
  sendSuccess(res, result, 'Bulk employee upload completed');
};

export const getCorporateReportsController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporateReports(companyKey);
  sendSuccess(res, data, 'Corporate reports retrieved successfully');
};

export const getCorporateProgramsController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporatePrograms(companyKey);
  sendSuccess(res, data, 'Corporate programs retrieved successfully');
};

export const getCorporateWorkshopsController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporateWorkshops(companyKey);
  sendSuccess(res, data, 'Corporate workshops retrieved successfully');
};

export const getCorporateCampaignsController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporateCampaigns(companyKey);
  sendSuccess(res, data, 'Corporate campaigns retrieved successfully');
};

export const getCorporateEmployeesController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporateEmployees(companyKey, {
    department: typeof req.query.department === 'string' ? req.query.department : undefined,
    query: typeof req.query.query === 'string' ? req.query.query : undefined,
    limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
    offset: typeof req.query.offset === 'string' ? Number(req.query.offset) : undefined,
  });
  sendSuccess(res, data, 'Corporate employees retrieved successfully');
};

export const getCorporateInvoicesController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporateInvoices(companyKey);
  sendSuccess(res, data, 'Corporate invoices retrieved successfully');
};

export const getCorporatePaymentMethodsController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporatePaymentMethods(companyKey);
  sendSuccess(res, data, 'Corporate payment methods retrieved successfully');
};

export const createCorporatePaymentMethodController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await createCorporatePaymentMethod(req.body || {}, companyKey);
  sendSuccess(res, data, 'Corporate payment method created successfully');
};

export const updateCorporatePaymentMethodController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const id = String(req.params?.id || '').trim();
  if (!id) {
    throw new AppError('payment method id is required', 400);
  }
  const data = await updateCorporatePaymentMethod(id, req.body || {}, companyKey);
  sendSuccess(res, data, 'Corporate payment method updated successfully');
};

export const getCorporateSessionAllocationsController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporateSessionAllocations(companyKey);
  sendSuccess(res, data, 'Corporate session allocations retrieved successfully');
};

export const updateCorporateSessionAllocationsController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const allocations = Array.isArray(req.body?.allocations) ? req.body.allocations : [];
  if (!allocations.length) {
    throw new AppError('allocations must be a non-empty array', 400);
  }

  const data = await updateCorporateSessionAllocations(allocations, companyKey);
  sendSuccess(res, data, 'Corporate session allocations updated successfully');
};

export const createCorporateProgramController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await createCorporateProgram(req.body || {}, companyKey);
  sendSuccess(res, data, 'Corporate program created successfully');
};

export const createCorporateWorkshopController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await createCorporateWorkshop(req.body || {}, companyKey);
  sendSuccess(res, data, 'Corporate workshop created successfully');
};

export const createCorporateCampaignController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await createCorporateCampaign(req.body || {}, companyKey);
  sendSuccess(res, data, 'Corporate campaign created successfully');
};

export const getCorporateRoiController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporateRoi(companyKey);
  sendSuccess(res, data, 'Corporate ROI retrieved successfully');
};

export const getCorporateSettingsController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await getCorporateSettings(companyKey);
  sendSuccess(res, data, 'Corporate settings retrieved successfully');
};

export const updateCorporateSettingsController = async (req: Request, res: Response): Promise<void> => {
  const companyKey = resolveCompanyKey(req);
  const data = await updateCorporateSettings(req.body || {}, companyKey);
  sendSuccess(res, data, 'Corporate settings updated successfully');
};
