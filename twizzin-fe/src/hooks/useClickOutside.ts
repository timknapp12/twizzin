import { useEffect, RefObject } from 'react';

// eslint-disable-next-line no-unused-vars
type Handler = (event: MouseEvent) => void;

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  refs: RefObject<T>[] | RefObject<T>,
  handler: Handler,
  excludeClassNames: string[] = []
): void {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const refsArray = Array.isArray(refs) ? refs : [refs];

      // Check if click is inside
      for (const className of excludeClassNames) {
        const element = document.querySelector(`.${className}`);
        if (element?.contains(event.target as Node)) {
          return;
        }
      }

      // Check if click is inside any of the refs
      const isInside = refsArray.some(
        (ref) => ref.current && ref.current.contains(event.target as Node)
      );

      if (!isInside) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [refs, handler, excludeClassNames]);
}

// Single ref usage
// useClickOutside(modalRef, onClose);

// Multiple refs
// useClickOutside([modalRef, triggerRef], onClose);

// With excluded elements
// useClickOutside(modalRef, onClose, ['some-modal-class']);
