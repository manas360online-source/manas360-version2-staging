import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, UserRound } from 'lucide-react';

type LegalFeatureCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  variant?: 'light' | 'danger' | 'dark';
  isClickable?: boolean;
  onClick?: () => void;
};

function LegalFeatureCard({ title, description, icon, variant = 'light', isClickable, onClick }: LegalFeatureCardProps) {
  const variantStyles =
    variant === 'danger'
      ? 'border-red-300 bg-[#ea252a] text-white shadow-red-200/80'
      : variant === 'dark'
        ? 'border-[#0f1a3d] bg-[#0b1636] text-white shadow-slate-300/70'
        : 'border-slate-200 bg-white text-slate-900 shadow-slate-200/80';

  const descriptionStyles = variant === 'light' ? 'text-slate-600' : 'text-white/85';

  return (
    <article
      className={`relative min-h-[196px] rounded-2xl border p-6 shadow-xl transition-transform duration-200 ease-out ${isClickable ? 'cursor-pointer hover:scale-[1.05] hover:shadow-2xl' : 'hover:scale-[1.02]'} ${variantStyles}`}
      onClick={onClick}
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
        {icon}
      </div>
      <h3 className="mt-5 text-[30px] font-display font-semibold leading-[1.08] tracking-tight">{title}</h3>
      <p className={`mt-3 text-sm leading-relaxed ${descriptionStyles}`}>{description}</p>
    </article>
  );
}

export default function CentralizedLegalDocumentManagement() {
  const navigate = useNavigate();

  return (
    <>
    <section className="mx-auto w-full max-w-[1240px] px-3 py-8 sm:px-5 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-[#dce5f2] bg-[#f7faff] p-6 shadow-sm sm:p-10">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-[#deebff] bg-[#eef5ff] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4079cf]">
            Regulatory Hub v3.1
          </span>
          <h1 className="mt-5 text-[40px] font-display font-bold leading-[1.06] tracking-tight text-[#0f172a] sm:text-[56px]">
            Centralized Legal
            <span className="block text-[#2d6cdf]">Document Management</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#66728a]">
            The single source of truth for platform agreements, DPDPA 2023 privacy oversight, and automated risk mitigation.
          </p>
        </header>

        <div className="relative mt-10">
          <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-28 rounded-3xl bg-[#eaf2ff] lg:block" />
          <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <LegalFeatureCard
            title="Patient Registration"
            description="DPDPA-compliant consent and digital signature acceptance"
            icon={<UserRound className="h-4 w-4" />}
            isClickable
            onClick={() => navigate('/admin/users')}
          />
          <LegalFeatureCard
            title="NRI Legal Protection"
            description="Jurisdiction and liability waivers for international users"
            icon={<FileText className="h-4 w-4" />}
            variant="danger"
            isClickable
            onClick={() => navigate('/admin/data-privacy-hub')}
          />
          <LegalFeatureCard
            title="Governance Console"
            description="Manage document versioning, repository, and governance tracking"
            icon={<FileText className="h-4 w-4" />}
            variant="dark"
            isClickable
            onClick={() => navigate('/admin/compliance')}
          />
          <LegalFeatureCard
            title="Patient Rights Portal"
            description="Access, correction, and data deletion under DPDPA"
            icon={<Shield className="h-4 w-4" />}
            isClickable
            onClick={() => navigate('/admin/data-requests')}
          />
          </div>
        </div>
      </div>
    </section>

    </>
  );
}