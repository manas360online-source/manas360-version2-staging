import { useEffect, useMemo, useState } from 'react';
import { corporateApi } from '../../api/corporate.api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';

type TemplateItem = {
  id: number;
  template_name?: string;
  template_type?: string;
};

type TemplateResponse = {
  items?: TemplateItem[];
};

const fallbackTemplates: TemplateItem[] = [
  { id: 1, template_name: 'Corporate Master Service Agreement', template_type: 'corporate' },
  { id: 2, template_name: 'Employee Wellbeing Agreement', template_type: 'corporate' },
  { id: 3, template_name: 'School Partnership Agreement', template_type: 'school' },
];

type CreateAgreementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdAgreement?: {
    id: number;
    agreement_number: string;
    partner_name: string;
    partner_type: string;
    annual_value: number;
    status: string;
    signature_status: string;
    qr_code_url?: string | null;
    qr_url?: string | null;
    qrUrl?: string | null;
  }) => void;
};

type PricingModel = 'per_member' | 'flat_rate' | 'tiered';
type ContractType = 'annual' | 'multi_year' | 'pilot' | 'renewal';
type PaymentTerms = 'monthly' | 'quarterly' | 'annual';
type ContractStatus = 'draft' | 'active';

type AgreementFormState = {
  agreementNumber: string;
  totalValue: string;
  finalValue: string;
  template: string;
  partnerName: string;
  email: string;
  pricingModel: PricingModel;
  pricePerMember: string;
  flatRate: string;
  discountPercent: string;
  maxMembers: string;
  startDate: string;
  endDate: string;
  contractType: ContractType;
  paymentTerms: PaymentTerms;
  status: ContractStatus;
  signedBy: string;
  signedDate: string;
};

const defaultFormState: AgreementFormState = {
  agreementNumber: '',
  totalValue: '',
  finalValue: '',
  template: '',
  partnerName: '',
  email: '',
  pricingModel: 'per_member',
  pricePerMember: '',
  flatRate: '',
  discountPercent: '',
  maxMembers: '',
  startDate: '',
  endDate: '',
  contractType: 'annual',
  paymentTerms: 'monthly',
  status: 'draft',
  signedBy: '',
  signedDate: '',
};

const getNextMockAgreementCounter = (year: number): number => {
  const storageKey = `mans360.corp.agreementCounter.${year}`;

  if (typeof window !== 'undefined') {
    const fromStorage = Number(window.localStorage.getItem(storageKey) || '0');
    const next = Number.isFinite(fromStorage) ? fromStorage + 1 : 1;
    window.localStorage.setItem(storageKey, String(next));
    return next;
  }

  return 1;
};

const generateAgreementNumber = (): string => {
  const year = new Date().getFullYear();
  const sequence = String(getNextMockAgreementCounter(year)).padStart(3, '0');
  return `MANS360-CORP-${year}-${sequence}`;
};

const resolveQrUrl = (payload: any): string | null => {
  const candidate = String(
    payload?.qr_code_url
      || payload?.qr_url
      || payload?.qrUrl
      || payload?.trackingUrl
      || payload?.tracking_url
      || payload?.destinationUrl
      || payload?.destination_url
      || payload?.qrCode?.trackingUrl
      || payload?.qrCode?.destinationUrl
      || payload?.qrCode?.redirectUrl
      || payload?.qrCode?.code
      || '',
  ).trim();

  if (!candidate) {
    return null;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (candidate.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${candidate}`;
    }
    return candidate;
  }

  // If backend only returns a code, keep it as-is for visibility in UI.
  return candidate;
};

const calculatePricingValues = (input: {
  pricingModel: PricingModel;
  pricePerMember: string;
  flatRate: string;
  maxMembers: string;
  discountPercent: string;
}): { totalValue: number; finalValue: number } => {
  const pricePerMember = Number(input.pricePerMember || 0);
  const maxMembers = Number(input.maxMembers || 0);
  const flatRate = Number(input.flatRate || 0);
  const discountPercent = Number(input.discountPercent || 0);

  let totalValue = 0;
  if (input.pricingModel === 'per_member') {
    totalValue = pricePerMember * maxMembers;
  } else if (input.pricingModel === 'flat_rate') {
    totalValue = flatRate;
  } else {
    totalValue = flatRate > 0 ? flatRate : pricePerMember * maxMembers;
  }

  const finalValue = totalValue - (totalValue * discountPercent / 100);
  return {
    totalValue: Math.round(totalValue),
    finalValue: Math.round(finalValue),
  };
};

const toIsoDate = (value: string): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
};

const mergeTemplates = (apiTemplates: TemplateItem[]): TemplateItem[] => {
  const merged: TemplateItem[] = [];
  const seen = new Set<string>();

  const add = (template: TemplateItem) => {
    const idKey = `id:${String(template.id)}`;
    const nameKey = `name:${String(template.template_name || '').trim().toLowerCase()}`;
    if (seen.has(idKey) || (String(template.template_name || '').trim() && seen.has(nameKey))) {
      return;
    }

    merged.push(template);
    seen.add(idKey);
    if (String(template.template_name || '').trim()) {
      seen.add(nameKey);
    }
  };

  apiTemplates.forEach(add);
  fallbackTemplates.forEach(add);

  return merged;
};

export default function CreateAgreementModal({ isOpen, onClose, onSuccess }: CreateAgreementModalProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [form, setForm] = useState<AgreementFormState>(defaultFormState);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => String(template.id) === form.template) || null,
    [form.template, templates],
  );

  useEffect(() => {
    if (!isOpen) return;

    const loadTemplates = async () => {
      setLoadingTemplates(true);
      setError(null);
      try {
        const response = await corporateApi.getAgreementTemplates() as TemplateResponse;
        const list = Array.isArray(response?.items) ? response.items : [];
        const resolved = mergeTemplates(list);
        setTemplates(resolved);
        setForm((prev) => ({
          ...prev,
          template: prev.template || String(resolved[0]?.id || ''),
        }));
      } catch (err: any) {
        setTemplates(fallbackTemplates);
        setForm((prev) => ({
          ...prev,
          template: prev.template || String(fallbackTemplates[0]?.id || ''),
        }));
        setError(null);
      } finally {
        setLoadingTemplates(false);
      }
    };

    void loadTemplates();
  }, [isOpen]);

  const resetForm = () => {
    setForm({
      ...defaultFormState,
      template: String(templates[0]?.id || ''),
    });
    setError(null);
  };

  const onFormChange = <K extends keyof AgreementFormState>(field: K, value: AgreementFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (!name) return;
    onFormChange(name as keyof AgreementFormState, value as never);
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (!name) return;
    onFormChange(name as keyof AgreementFormState, value as never);
  };

  const parseNumber = (value: string): number | null => {
    if (!String(value || '').trim()) return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return numeric;
  };

  const discountPercent = parseNumber(form.discountPercent) ?? 0;

  const pricingPreview = useMemo(() => {
    return calculatePricingValues({
      pricingModel: form.pricingModel,
      pricePerMember: form.pricePerMember,
      flatRate: form.flatRate,
      maxMembers: form.maxMembers,
      discountPercent: form.discountPercent,
    });
  }, [form.discountPercent, form.flatRate, form.maxMembers, form.pricePerMember, form.pricingModel]);

  const emailValid = /\S+@\S+\.\S+/.test(form.email.trim());
  const maxMembersValid = (parseNumber(form.maxMembers) ?? 0) > 0;
  const discountValid = discountPercent >= 0 && discountPercent <= 100;
  const startDateValid = Boolean(form.startDate);
  const endDateValid = Boolean(form.endDate);
  const dateOrderValid = !form.startDate || !form.endDate || new Date(form.endDate) >= new Date(form.startDate);

  const pricingFieldsValid = useMemo(() => {
    const perMember = (parseNumber(form.pricePerMember) ?? 0) > 0;
    const flatRate = (parseNumber(form.flatRate) ?? 0) > 0;

    if (form.pricingModel === 'per_member') return perMember;
    if (form.pricingModel === 'flat_rate') return flatRate;
    return perMember || flatRate;
  }, [form.flatRate, form.pricePerMember, form.pricingModel]);

  const partnerNameValid = form.partnerName.trim().length > 0;
  const pricingModelValid = Boolean(form.pricingModel);
  const requiredTextReady = Boolean(form.template) && partnerNameValid && form.signedBy.trim().length > 0 && Boolean(form.signedDate);

  const canSubmit =
    !loadingTemplates &&
    !submitting &&
    requiredTextReady &&
    emailValid &&
    pricingModelValid &&
    pricingFieldsValid &&
    maxMembersValid &&
    discountValid &&
    startDateValid &&
    endDateValid &&
    dateOrderValid;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.template) {
      setError('Please select a template');
      return;
    }

    if (!partnerNameValid) {
      setError('Partner Name is required.');
      return;
    }

    if (!pricingModelValid) {
      setError('Pricing Model is required.');
      return;
    }

    if (!emailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!pricingFieldsValid) {
      setError('Please provide pricing details based on selected pricing model.');
      return;
    }

    if (!maxMembersValid) {
      setError('Max Members must be a positive number.');
      return;
    }

    if (!discountValid) {
      setError('Discount Percent must be between 0 and 100.');
      return;
    }

    if (!dateOrderValid) {
      setError('End Date must be on or after Start Date.');
      return;
    }

    const generatedAgreementNumber = generateAgreementNumber();
    const { totalValue, finalValue } = calculatePricingValues({
      pricingModel: form.pricingModel,
      pricePerMember: form.pricePerMember,
      flatRate: form.flatRate,
      maxMembers: form.maxMembers,
      discountPercent: form.discountPercent,
    });

    setForm((prev) => ({
      ...prev,
      agreementNumber: generatedAgreementNumber,
      totalValue: String(totalValue),
      finalValue: String(finalValue),
    }));

    setSubmitting(true);
    setError(null);

    const buildLocalAgreementFallback = () => ({
      id: Date.now(),
      agreement_number: generatedAgreementNumber,
      partner_name: form.partnerName.trim(),
      partner_type: 'corporate',
      annual_value: finalValue,
      status: form.status,
      signature_status: 'draft',
      qr_code_url: null,
      qr_url: null,
      qrUrl: null,
    });

    try {
      let created: unknown;
      let usedLocalFallback = false;

      try {
        created = await corporateApi.createAdminContract({
          entity_id: null,
          contract_type: form.contractType,
          pricing_model: form.pricingModel,
          price_per_member_per_year: parseNumber(form.pricePerMember),
          flat_annual_rate: parseNumber(form.flatRate),
          max_members: Number(form.maxMembers),
          contract_start_date: form.startDate,
          contract_end_date: form.endDate,
          payment_terms: form.paymentTerms,
          discount_percent: discountPercent,
          signed_by_entity: form.signedBy.trim(),
          signed_date: form.signedDate,
        });
      } catch (adminContractError: any) {
        const status = Number(adminContractError?.response?.status || 0);
        const backendMessage = String(adminContractError?.response?.data?.message || '').toLowerCase();
        const isRouteMissing = status === 404 && backendMessage.includes('route not found');

        if (!isRouteMissing) {
          throw adminContractError;
        }

        // Backward-compatible fallback for environments that don't yet expose /v1/admin/contracts/create.
        try {
          created = await corporateApi.createAgreement({
            template_id: Number(form.template),
            agreement_type: `${String(selectedTemplate?.template_type || 'corporate')}-${form.contractType}`,
            partner_name: form.partnerName.trim(),
            partner_type: 'corporate',
            partner_contact_name: form.signedBy.trim(),
            partner_contact_email: form.email.trim(),
            partner_contact_phone: '+919000000000',
            start_date: toIsoDate(form.startDate),
            end_date: toIsoDate(form.endDate),
            annual_value: finalValue,
            payment_terms: form.paymentTerms,
            billing_cycle: form.paymentTerms,
            template_data: {
              agreementNumber: generatedAgreementNumber,
              totalValue,
              finalValue,
              partner_name: form.partnerName.trim(),
              email: form.email.trim(),
              annual_value: finalValue,
              pricing_model: form.pricingModel,
              price_per_member_per_year: parseNumber(form.pricePerMember),
              flat_annual_rate: parseNumber(form.flatRate),
              discount_percent: discountPercent,
              max_members: parseNumber(form.maxMembers),
              contract_type: form.contractType,
              payment_terms: form.paymentTerms,
              status: form.status,
              contract_start_date: form.startDate,
              contract_end_date: form.endDate,
              signed_by_entity: form.signedBy.trim(),
              signed_date: form.signedDate,
            },
          });
        } catch (agreementError: any) {
          const agreementMessage = String(agreementError?.response?.data?.message || agreementError?.message || '').toLowerCase();
          const isTemplateMissing = agreementMessage.includes('template not found');

          if (!isTemplateMissing) {
            throw agreementError;
          }

          created = buildLocalAgreementFallback();
          usedLocalFallback = true;
          toast.success(`Agreement created locally (${generatedAgreementNumber})`);
        }
      }

      let generatedQrUrl: string | null = resolveQrUrl(created as any);
      
      if (!generatedQrUrl) {
        try {
          const payload = {
            location: String(generatedAgreementNumber || 'agreement').toLowerCase(),
          };
          const qrPayload = await corporateApi.createEapQr(payload);
          generatedQrUrl = resolveQrUrl(qrPayload as any);
        } catch {
          // QR generation should not block agreement creation.
          generatedQrUrl = null;
        }
      }

      const createdAgreement = {
        id: Number((created as any)?.id || Date.now()),
        agreement_number: String((created as any)?.agreement_number || generatedAgreementNumber),
        partner_name: String((created as any)?.partner_name || form.partnerName.trim()),
        partner_type: String((created as any)?.partner_type || 'corporate'),
        annual_value: Number((created as any)?.annual_value || finalValue),
        status: String((created as any)?.status || form.status),
        signature_status: String((created as any)?.signature_status || 'draft'),
        qr_code_url: generatedQrUrl,
        qr_url: generatedQrUrl,
        qrUrl: generatedQrUrl,
      };

      onSuccess?.(createdAgreement);
      if (!usedLocalFallback) {
        toast.success(`Agreement created successfully (${generatedAgreementNumber})`);
      }
      handleClose();
    } catch (err: any) {
      const message = String(err?.response?.data?.message || err?.message || 'Failed to create agreement');
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Agreement" size="xl">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/20 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700">Basic Info</h3>
          <div>
            <label htmlFor="agreement-template" className="mb-2 block text-sm font-medium text-wellness-text">
              Template
            </label>
            <select
              id="agreement-template"
              name="template"
              className="w-full rounded-2xl border-2 border-calm-sage/30 bg-white px-4 py-3 text-wellness-text focus:border-calm-sage focus:outline-none focus:ring-2 focus:ring-calm-sage/20"
              value={form.template}
              onChange={handleSelectChange}
              disabled={loadingTemplates || submitting}
              required
            >
              {templates.length === 0 ? (
                <option value="">No templates available</option>
              ) : (
                templates.map((template) => (
                  <option key={template.id} value={String(template.id)}>
                    {template.template_name || `Template ${template.id}`}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="agreement-partner-name"
              name="partnerName"
              label="Partner Name"
              value={form.partnerName}
              onChange={handleInputChange}
              disabled={submitting}
              required
            />
            <Input
              id="agreement-email"
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              disabled={submitting}
              required
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/20 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700">Pricing Section</h3>
          <div>
            <label htmlFor="pricing-model" className="mb-2 block text-sm font-medium text-wellness-text">
              Pricing Model
            </label>
            <select
              id="pricing-model"
              name="pricingModel"
              className="w-full rounded-2xl border-2 border-calm-sage/30 bg-white px-4 py-3 text-wellness-text focus:border-calm-sage focus:outline-none focus:ring-2 focus:ring-calm-sage/20"
              value={form.pricingModel}
              onChange={handleSelectChange}
              disabled={submitting}
              required
            >
              <option value="per_member">per_member</option>
              <option value="flat_rate">flat_rate</option>
              <option value="tiered">tiered</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              id="price-per-member"
              name="pricePerMember"
              label="Price Per Member"
              type="number"
              min="0"
              step="1"
              value={form.pricePerMember}
              onChange={handleInputChange}
              disabled={submitting}
              required={form.pricingModel === 'per_member'}
            />
            <Input
              id="flat-annual-rate"
              name="flatRate"
              label="Flat Annual Rate"
              type="number"
              min="0"
              step="1"
              value={form.flatRate}
              onChange={handleInputChange}
              disabled={submitting}
              required={form.pricingModel === 'flat_rate'}
            />
            <Input
              id="discount-percent"
              name="discountPercent"
              label="Discount Percent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.discountPercent}
              onChange={handleInputChange}
              disabled={submitting}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/20 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700">Capacity</h3>
          <Input
            id="max-members"
            name="maxMembers"
            label="Max Members"
            type="number"
            min="1"
            step="1"
            value={form.maxMembers}
            onChange={handleInputChange}
            disabled={submitting}
            required
          />
        </section>

        <section className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/20 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700">Contract Duration</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="start-date"
              name="startDate"
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={handleInputChange}
              disabled={submitting}
              required
            />
            <Input
              id="end-date"
              name="endDate"
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={handleInputChange}
              disabled={submitting}
              required
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/20 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700">Contract Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="contract-type" className="mb-2 block text-sm font-medium text-wellness-text">
                Contract Type
              </label>
              <select
                id="contract-type"
                name="contractType"
                className="w-full rounded-2xl border-2 border-calm-sage/30 bg-white px-4 py-3 text-wellness-text focus:border-calm-sage focus:outline-none focus:ring-2 focus:ring-calm-sage/20"
                value={form.contractType}
                onChange={handleSelectChange}
                disabled={submitting}
                required
              >
                <option value="annual">annual</option>
                <option value="multi_year">multi_year</option>
                <option value="pilot">pilot</option>
                <option value="renewal">renewal</option>
              </select>
            </div>

            <div>
              <label htmlFor="payment-terms" className="mb-2 block text-sm font-medium text-wellness-text">
                Payment Terms
              </label>
              <select
                id="payment-terms"
                name="paymentTerms"
                className="w-full rounded-2xl border-2 border-calm-sage/30 bg-white px-4 py-3 text-wellness-text focus:border-calm-sage focus:outline-none focus:ring-2 focus:ring-calm-sage/20"
                value={form.paymentTerms}
                onChange={handleSelectChange}
                disabled={submitting}
                required
              >
                <option value="monthly">monthly</option>
                <option value="quarterly">quarterly</option>
                <option value="annual">annual</option>
              </select>
            </div>

            <div>
              <label htmlFor="contract-status" className="mb-2 block text-sm font-medium text-wellness-text">
                Status
              </label>
              <select
                id="contract-status"
                name="status"
                className="w-full rounded-2xl border-2 border-calm-sage/30 bg-white px-4 py-3 text-wellness-text focus:border-calm-sage focus:outline-none focus:ring-2 focus:ring-calm-sage/20"
                value={form.status}
                onChange={handleSelectChange}
                disabled={submitting}
                required
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/20 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700">Signature</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="signed-by"
              name="signedBy"
              label="Signed By"
              value={form.signedBy}
              onChange={handleInputChange}
              disabled={submitting}
              required
            />
            <Input
              id="signed-date"
              name="signedDate"
              label="Signed Date"
              type="date"
              value={form.signedDate}
              onChange={handleInputChange}
              disabled={submitting}
              required
            />
          </div>
        </section>

        <div className="rounded-xl border border-calm-sage/20 bg-calm-sage/5 px-4 py-3 text-sm text-ink-700">
          Total Value: <span className="font-semibold">{pricingPreview.totalValue.toLocaleString('en-IN')}</span>
          {' · '}
          Final Value (after discount): <span className="font-semibold">{pricingPreview.finalValue.toLocaleString('en-IN')}</span>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            Create Agreement
          </Button>
        </div>
      </form>
    </Modal>
  );
}
