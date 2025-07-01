import { useState, useEffect, useRef } from 'react';

interface ImageCarouselProps {
  images: string[];
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollInterval = setInterval(() => {
      setScrollPosition((prevPosition) => {
        const newPosition = prevPosition + 1;
        return newPosition >= images.length * 400 ? 0 : newPosition;
      });
    }, 50);

    return () => clearInterval(scrollInterval);
  }, [images.length]);

  return (
    <div 
      ref={carouselRef}
      className="h-[calc(100dvh-240px)] overflow-hidden rounded-xl"
      style={{ 
        maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
      }}
    >
      <div 
        className="flex flex-col gap-4"
        style={{ transform: `translateY(-${scrollPosition}px)` }}
      >
        {[...images, ...images].map((src, index) => (
          <div 
            key={index} 
            className="w-full aspect-square rounded-xl overflow-hidden"
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

