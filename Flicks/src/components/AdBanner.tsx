import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
   
     if (containerRef.current && !containerRef.current.firstChild) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://valuationappeared.com/49/57/2e/49572e4d1d403f04572eaef96eb52476.js';
      script.async = true;
      containerRef.current.appendChild(script);
    }
    
  }, []);

  return (
    <div 
      className={`w-full flex justify-center items-center my-6 bg-zinc-900/50 rounded-lg min-h-22.5 ${className}`}
      ref={containerRef}
    >
      <span className="text-zinc-600 text-sm italic">Advertisement Space (Adsterra)</span>
    </div>
  );
};
