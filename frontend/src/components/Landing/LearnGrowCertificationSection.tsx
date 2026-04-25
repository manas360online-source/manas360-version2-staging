import React from 'react';
import { Link } from 'react-router-dom';

export const LearnGrowCertificationSection: React.FC = () => {
	return (
		<section className="py-16 md:py-20" aria-labelledby="certification-ecosystem-title">
			<div className="mx-auto max-w-5xl rounded-3xl border border-calm-sage/20 bg-white p-6 shadow-soft-sm sm:p-8 md:p-10">
				<div className="text-center">
					<h2 id="certification-ecosystem-title" className="font-serif text-3xl font-light text-charcoal md:text-4xl">
						Transform Your Career,
						<br />
						Transform Lives
					</h2>
					<p className="mx-auto mt-4 max-w-3xl text-sm text-charcoal/70 md:text-base">
						Join India's premier mental health certification ecosystem. From community champions to consciousness masters,
						choose your path and start earning within weeks.
					</p>
				</div>

				<div className="mt-8 grid gap-3 sm:grid-cols-3">
					<div className="rounded-xl border border-calm-sage/20 bg-cream px-4 py-3 text-center">
						<p className="text-xl font-semibold text-charcoal">6</p>
						<p className="text-sm text-charcoal/70">Professional Certifications</p>
					</div>
					<div className="rounded-xl border border-calm-sage/20 bg-cream px-4 py-3 text-center">
						<p className="text-xl font-semibold text-charcoal">₹6L+</p>
						<p className="text-sm text-charcoal/70">Annual Earning Potential</p>
					</div>
					<div className="rounded-xl border border-calm-sage/20 bg-cream px-4 py-3 text-center">
						<p className="text-xl font-semibold text-charcoal">5 Weeks</p>
						<p className="text-sm text-charcoal/70">Fastest to Market</p>
					</div>
				</div>

				<div className="mt-8 text-center">
					<Link
						to="/certifications"
						className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-gradient-calm px-7 py-3 text-sm font-semibold text-white shadow-soft-sm transition hover:shadow-soft-md"
					>
						Choose Your Certification
					</Link>
				</div>
			</div>
		</section>
	);
};

export default LearnGrowCertificationSection;
