import React from 'react';
import { Helmet } from 'react-helmet-async';

export const MyDigitalClinicPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>MyDigitalClinic - MANAS360</title>
        <meta name="description" content="Your personal digital clinic portal" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-cream to-white">
        {/* Header */}
        <div className="border-b border-calm-sage/20 bg-white shadow-soft-md">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-charcoal">MyDigitalClinic</h1>
            <p className="mt-2 text-sm text-charcoal/60">
              Your personalized digital health management platform
            </p>
          </div>
        </div>

        {/* Main Content */}
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Features Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Health Records',
                description: 'Access and manage your complete health history',
                icon: '📋',
              },
              {
                title: 'Appointments',
                description: 'Schedule and manage your medical appointments',
                icon: '📅',
              },
              {
                title: 'Prescriptions',
                description: 'View and manage your prescriptions online',
                icon: '💊',
              },
              {
                title: 'Lab Reports',
                description: 'Access your laboratory test results',
                icon: '🔬',
              },
              {
                title: 'Consultations',
                description: 'Connect with healthcare providers online',
                icon: '💬',
              },
              {
                title: 'Wellness Tracking',
                description: 'Monitor your health metrics and lifestyle',
                icon: '📊',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-calm-sage/20 bg-white p-6 shadow-soft-md transition-All duration-300 hover:shadow-md hover:border-calm-sage/40"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-charcoal">{feature.title}</h3>
                <p className="mt-2 text-sm text-charcoal/60">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Call-to-Action Section */}
          <div className="mt-12 rounded-lg bg-gradient-to-r from-gentle-blue/10 to-calm-sage/10 border border-calm-sage/20 p-8 text-center">
            <h2 className="text-2xl font-semibold text-charcoal">
              Start Managing Your Health Today
            </h2>
            <p className="mt-2 text-charcoal/60">
              Connect with licensed healthcare providers and take control of your wellness journey.
            </p>
            <div className="mt-6 flex gap-4 justify-center">
              <button className="inline-flex items-center justify-center rounded-full bg-gentle-blue px-6 py-2.5 font-medium text-white transition-all duration-300 hover:bg-gentle-blue/90">
                Book Appointment
              </button>
              <button className="inline-flex items-center justify-center rounded-full border border-calm-sage/40 px-6 py-2.5 font-medium text-charcoal transition-all duration-300 hover:bg-calm-sage/5">
                Learn More
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default MyDigitalClinicPage;
