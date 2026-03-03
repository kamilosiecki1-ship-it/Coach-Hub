export function MentorMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Vertical petal — main */}
      <path
        d="M12 2C13.1 5.5 14 8.8 14 12C14 15.2 13.1 18.5 12 22C10.9 18.5 10 15.2 10 12C10 8.8 10.9 5.5 12 2Z"
        fill="currentColor"
      />
      {/* Horizontal petal */}
      <path
        d="M2 12C5.5 10.9 8.8 10 12 10C15.2 10 18.5 10.9 22 12C18.5 13.1 15.2 14 12 14C8.8 14 5.5 13.1 2 12Z"
        fill="currentColor"
        opacity="0.7"
      />
      {/* Small sparkle accent — top right */}
      <path
        d="M18.5 5.5L19.2 7.2L21 7.5L19.2 7.8L18.5 9.5L17.8 7.8L16 7.5L17.8 7.2Z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Center circle */}
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}
