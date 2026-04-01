import { useEffect } from 'react';

export default function CorporateWellnessAgr() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Corporate Wellness Agreement</h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600">Content intentionally left blank. Add Corporate Wellness Agreement content here.</p>
        </div>
      </div>
    </div>
  );
}
