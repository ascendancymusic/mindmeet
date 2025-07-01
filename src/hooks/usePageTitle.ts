import { useEffect } from 'react';

export const usePageTitle = (title: string) => {
  useEffect(() => {
    const baseTitle = 'MindMeet';
    const fullTitle = title ? `${baseTitle} - ${title}` : baseTitle;
    
    // Update the document title
    document.title = fullTitle;
    
    // Cleanup function to reset to base title when component unmounts
    return () => {
      document.title = baseTitle;
    };
  }, [title]);
};
