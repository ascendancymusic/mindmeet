import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import './MarqueeText.css';

interface MarqueeTextProps {
  text: string;
  className?: string;
  durationSeconds?: number;
}

const GAP_IN_PX = 32;

export function MarqueeText({ text, className = '', durationSeconds = 12 }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [marqueeStyle, setMarqueeStyle] = useState<CSSProperties>({});

  const containerStyle = useMemo<CSSProperties>(
    () =>
      ({
        '--marquee-gap': `${GAP_IN_PX}px`,
      }) as CSSProperties,
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const computeOverflow = () => {
      const shouldMarquee = content.scrollWidth > container.clientWidth + 1;
      setIsOverflowing(shouldMarquee);

      if (shouldMarquee) {
        setMarqueeStyle({
          '--marquee-translate': `${content.scrollWidth + GAP_IN_PX}px`,
          '--marquee-duration': `${durationSeconds}s`,
        } as CSSProperties);
      } else {
        setMarqueeStyle({});
      }
    };

    computeOverflow();

    const resizeObserver = new ResizeObserver(() => {
      computeOverflow();
    });

    resizeObserver.observe(container);
    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [text, durationSeconds]);

  // Re-run overflow detection when text changes even if ResizeObserver is unavailable.
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content) {
      return;
    }

    const shouldMarquee = content.scrollWidth > container.clientWidth + 1;
    setIsOverflowing(shouldMarquee);

    if (shouldMarquee) {
      setMarqueeStyle({
        '--marquee-translate': `${content.scrollWidth + GAP_IN_PX}px`,
        '--marquee-duration': `${durationSeconds}s`,
      } as CSSProperties);
    } else {
      setMarqueeStyle({});
    }
  }, [text, durationSeconds]);

  return (
    <div
      ref={containerRef}
      className={`marquee-container ${className}`.trim()}
      style={containerStyle}
      data-overflowing={isOverflowing}
    >
      <div
        className={`marquee-track${isOverflowing ? ' marquee-animate' : ''}`}
        style={marqueeStyle}
      >
        <span ref={contentRef} className="marquee-text">
          {text}
        </span>
        {isOverflowing && (
          <span className="marquee-text" aria-hidden="true">
            {text}
          </span>
        )}
      </div>
      {isOverflowing && (
        <>
          <div className="marquee-fade marquee-fade--left" />
          <div className="marquee-fade marquee-fade--right" />
        </>
      )}
    </div>
  );
}
