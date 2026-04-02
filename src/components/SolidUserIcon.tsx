import type { SVGProps } from 'react';

const SolidUserIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="7.5" r="4.5" />
      <path d="M4 20.5C4 16.634 7.582 13.5 12 13.5C16.418 13.5 20 16.634 20 20.5V22H4V20.5Z" />
    </svg>
  );
};

export default SolidUserIcon;
