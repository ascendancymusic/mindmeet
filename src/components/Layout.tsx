import { useLocation } from 'react-router-dom';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  // Routes heavily constrained by "container"
  // If we want Notes to take full width, we omit "container" on that route
  const isFullWidth = location.pathname.startsWith('/notes');
  const isChat = location.pathname.startsWith('/chat'); // Chat might also benefit from full width

  // The original App.tsx had: "flex-1 min-h-0 container mx-auto px-1 py-0"
  // We keep flex-1 min-h-0 always.
  // We conditionally apply container mx-auto px-1 py-0
  
  const containerClass = isFullWidth 
    ? "w-full flex flex-col overflow-hidden" 
    : "container mx-auto px-1 py-0 overflow-y-auto";

  return (
    <main className={`flex-1 min-h-0 ${containerClass}`}>
      {children}
    </main>
  );
};

export default Layout;
