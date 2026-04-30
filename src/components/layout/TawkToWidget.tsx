'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function TawkToWidget() {
  const pathname = usePathname();

  useEffect(() => {
    // Only load Tawk.to on dashboard or admin pages
    if (!pathname?.startsWith('/dashboard') && !pathname?.startsWith('/admin')) {
      return;
    }

    // Check if the script is already loaded to prevent duplicates
    if (document.getElementById('tawk-to-script')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'tawk-to-script';
    script.async = true;
    script.src = 'https://embed.tawk.to/69f28debfa5a451c37ba84bc/1jndnkoj1';
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }

    return () => {
      // Optional: Cleanup script if necessary when navigating away,
      // but Tawk.to usually handles its own lifecycle.
    };
  }, [pathname]);

  return null;
}
