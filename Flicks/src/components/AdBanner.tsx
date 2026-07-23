import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // --- ADSTERRA SCRIPT INSTRUCTIONS ---
    // Adsterra will provide you with a code snippet that looks like this:
    // <script type='text/javascript' src='//your-adsterra-code.com/invoke.js'></script>
    // 
    // To implement it safely in React:
    // 1. Uncomment the code below.
    // 2. Replace the 'src' string with your actual Adsterra script URL.
    
    /*
    if (containerRef.current && !containerRef.current.firstChild) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '//your-adsterra-script-url-here.js';
      script.async = true;
      containerRef.current.appendChild(script);
    }
    */
  }, []);

  return (
    <div 
      className={`w-full flex justify-center items-center my-6 bg-zinc-900/50 rounded-lg min-h-[90px] ${className}`}
      ref={containerRef}
    >
      <span className="text-zinc-600 text-sm italic">Advertisement Space (Adsterra)</span>
    </div>
  );
};
