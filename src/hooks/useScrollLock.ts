import { useEffect } from 'react';

// Reference-counted so overlapping overlays (a modal opened from another one)
// don't unlock the page when only the first of them closes.
let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

/** Freezes the page behind an overlay for as long as `active` stays true. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      const { body } = document;
      savedOverflow = body.style.overflow;
      savedPaddingRight = body.style.paddingRight;
      // Hiding the scrollbar widens the viewport; hold the width so the page
      // behind the overlay doesn't jump sideways.
      const gap = window.innerWidth - document.documentElement.clientWidth;
      if (gap > 0) body.style.paddingRight = `${gap}px`;
      body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
        document.body.style.paddingRight = savedPaddingRight;
      }
    };
  }, [active]);
}
