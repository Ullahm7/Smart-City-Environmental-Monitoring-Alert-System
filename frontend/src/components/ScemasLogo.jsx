function ScemasLogo({ size = 48, className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            className={className}
            aria-hidden="true"
        >
            <rect x="8" y="28" width="8" height="14" fill="#1e40af" />
            <rect x="18" y="20" width="8" height="22" fill="#1e40af" />
            <rect x="28" y="24" width="8" height="18" fill="#1e40af" />
            <rect x="38" y="30" width="6" height="12" fill="#1e40af" opacity="0.7" />

            <rect x="10" y="30" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="13" y="30" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="10" y="34" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="13" y="34" width="1.5" height="2" fill="white" opacity="0.4" />

            <rect x="20" y="24" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="23" y="24" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="20" y="28" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="23" y="28" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="20" y="32" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="23" y="32" width="1.5" height="2" fill="white" opacity="0.4" />

            <rect x="30" y="27" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="33" y="27" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="30" y="32" width="1.5" height="2" fill="white" opacity="0.4" />
            <rect x="33" y="32" width="1.5" height="2" fill="white" opacity="0.4" />

            <circle cx="12" cy="26" r="2.5" fill="#60a5fa" />
            <circle cx="22" cy="18" r="2.5" fill="#60a5fa" />
            <circle cx="32" cy="22" r="2.5" fill="#60a5fa" />

            <line x1="12" y1="26" x2="22" y2="18" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
            <line x1="22" y1="18" x2="32" y2="22" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />

            <line x1="6" y1="42" x2="44" y2="42" stroke="#1e40af" strokeWidth="2" />
        </svg>
    );
}

export default ScemasLogo;
