import { HK_TECH_BRAND } from "@/config/brand";

/**
 * HK Tech logo + optional text (sidebar, login, mobile header).
 */
const BrandLogo = ({
  showText = true,
  size = "md",
  className = "",
  subtitle,
}) => {
  const heights = { sm: "h-8", md: "h-10", lg: "h-14", xl: "h-16" };
  const imgClass = heights[size] || heights.md;

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <img
        src={HK_TECH_BRAND.logoUrl}
        alt={HK_TECH_BRAND.name}
        className={`${imgClass} w-auto object-contain flex-shrink-0`}
      />
      {showText && (
        <div className="min-w-0">
          <p className="text-base font-bold text-hk-gray dark:text-white truncate leading-tight">
            {HK_TECH_BRAND.name}
          </p>
          <p className="text-[11px] text-hk-gray-light dark:text-gray-400 truncate leading-snug">
            {subtitle || HK_TECH_BRAND.tagline}
          </p>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
