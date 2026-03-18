import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  schema?: object;
}

export const SEO: React.FC<SEOProps> = ({ title, description, schema }) => {
  useEffect(() => {
    document.title = title;
    
    // Update description meta tag
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description || '');

    // Handle Schema.org JSON-LD
    if (schema) {
      let script = document.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    }
  }, [title, description, schema]);

  return null;
};
