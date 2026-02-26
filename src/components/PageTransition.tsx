import { ReactNode, useEffect, useState } from "react";

interface PageTransitionProps {
  children: ReactNode;
  transitionKey: string;
}

export const PageTransition = ({ children, transitionKey }: PageTransitionProps) => {
  const [displayContent, setDisplayContent] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    
    const timer = setTimeout(() => {
      setDisplayContent(children);
      setIsTransitioning(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [transitionKey, children]);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        isTransitioning 
          ? "opacity-0 translate-y-2 scale-[0.99]" 
          : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      {displayContent}
    </div>
  );
};
