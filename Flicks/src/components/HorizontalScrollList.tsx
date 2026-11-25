import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { MediaItem } from '../services/TMDBService';
import { TMDBService } from '../services/TMDBService';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface Props {
  title: string;
  data: MediaItem[];
  onItemClick?: (item: MediaItem) => void;
}

export const HorizontalScrollList: React.FC<Props> = ({ title, data, onItemClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Suppress card click after a swipe/drag
  const hasDragged = useRef(false);
  const dragStartX = useRef(0);

  // Mouse grab-to-scroll (touch uses native overflow scrolling)
  const isMouseDragging = useRef(false);
  const mouseStartX = useRef(0);
  const mouseStartScrollLeft = useRef(0);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollButtons();

    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollButtons) : null;
    ro?.observe(el);

    const imgs = el.querySelectorAll('img');
    const onImgLoad = () => updateScrollButtons();
    imgs.forEach((img) => img.addEventListener('load', onImgLoad));

    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
      ro?.disconnect();
      imgs.forEach((img) => img.removeEventListener('load', onImgLoad));
    };
  }, [data, updateScrollButtons]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 200);
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  // --- Touch: track movement so we don't fire item click after a swipe ---
  const onTouchStart = (e: React.TouchEvent) => {
    hasDragged.current = false;
    dragStartX.current = e.touches[0]?.clientX ?? 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const x = e.touches[0]?.clientX ?? 0;
    if (Math.abs(x - dragStartX.current) > 8) {
      hasDragged.current = true;
    }
  };

  // --- Mouse: grab-to-scroll for desktop without relying only on arrows ---
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    isMouseDragging.current = true;
    hasDragged.current = false;
    mouseStartX.current = e.clientX;
    mouseStartScrollLeft.current = el.scrollLeft;
    dragStartX.current = e.clientX;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - mouseStartX.current;
    if (Math.abs(dx) > 6) {
      hasDragged.current = true;
    }
    el.scrollLeft = mouseStartScrollLeft.current - dx;
  };

  const endMouseDrag = () => {
    isMouseDragging.current = false;
    // Keep hasDragged long enough that the subsequent click is ignored
    if (hasDragged.current) {
      setTimeout(() => {
        hasDragged.current = false;
      }, 80);
    }
  };

  const handleItemClick = (item: MediaItem) => {
    if (hasDragged.current) return;
    onItemClick?.(item);
  };

  if (!data || data.length === 0) return null;

  return (
    <div className="my-8 relative">
      <h2 className="text-xl font-bold text-netflix-white mb-4 px-4 md:px-12">
        {title}
      </h2>

      {/* Buttons are positioned against the card row only */}
      <div className="relative">
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={`
            absolute left-0 top-0 bottom-0 z-30
            hidden md:flex items-center justify-center
            w-10 md:w-12
            bg-linear-to-r from-black/80 via-black/50 to-transparent
            text-white transition-opacity duration-200
            ${canScrollLeft
              ? 'opacity-80 hover:opacity-100 cursor-pointer'
              : 'opacity-0 pointer-events-none'}
          `}
        >
          <span className="bg-black/70 hover:bg-black/90 p-2 rounded-full">
            <FaChevronLeft size={20} />
          </span>
        </button>

        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`
            absolute right-0 top-0 bottom-0 z-30
            hidden md:flex items-center justify-center
            w-10 md:w-12
            bg-linear-to-l from-black/80 via-black/50 to-transparent
            text-white transition-opacity duration-200
            ${canScrollRight
              ? 'opacity-80 hover:opacity-100 cursor-pointer'
              : 'opacity-0 pointer-events-none'}
          `}
        >
          <span className="bg-black/70 hover:bg-black/90 p-2 rounded-full">
            <FaChevronRight size={20} />
          </span>
        </button>

        <div
          ref={scrollRef}
          className="
            flex overflow-x-auto gap-4 px-4 md:px-12 py-4
            no-scrollbar
            select-none
            cursor-grab active:cursor-grabbing
          "
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x pan-y',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endMouseDrag}
          onMouseLeave={endMouseDrag}
        >
          {data.map((item) => {
            const itemTitle = item.title || item.name || 'Unknown';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : '';
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className="
                  relative shrink-0 cursor-pointer
                  transition-transform duration-300
                  md:hover:scale-105 md:hover:z-10
                  rounded-md overflow-hidden
                  bg-netflix-dark-gray shadow-md
                "
                onClick={() => handleItemClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemClick(item);
                  }
                }}
              >
                {/*
                  draggable=false + pointer-events-none prevents the browser
                  from starting a native image drag, which was stealing
                  horizontal swipe gestures on mobile.
                */}
                <img
                  src={TMDBService.getImageUrl(item.poster_path, 'w500')}
                  alt={itemTitle}
                  className="w-32 md:w-40 h-48 md:h-60 object-cover pointer-events-none"
                  loading="lazy"
                  draggable={false}
                />
                {rating && (
                  <div className="absolute top-2 right-2 bg-black/80 rounded px-1.5 py-0.5 flex items-center gap-1 pointer-events-none">
                    <span className="text-yellow-400 text-xs">★</span>
                    <span className="text-white text-xs font-bold">{rating}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black via-black/80 to-transparent p-2 pt-8 pointer-events-none">
                  <h3 className="text-white text-xs md:text-sm font-semibold text-center truncate shadow-sm">
                    {itemTitle}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
