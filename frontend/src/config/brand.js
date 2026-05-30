/** HK Tech platform branding */
export const HK_TECH_BRAND = {
  name: "HK Tech",
  tagline: "Committed to a better Services",
  logoUrl: "/hk-tech-logo.png",
  phone: "+91 91737 85319",
  email: "info@hktech.net.in",
  address:
    "410, Kasturi Pride, Opp-Torrent Power Sub -Station, S.P. Ring Road, Nikol, Ahmedabad.382350.",
  colors: {
    teal: "#2D5A57",
    tealDark: "#234846",
    gray: "#333333",
    grayLight: "#9E9E9E",
    tealRgb: [45, 90, 87],
  },
  copyright: "HK Tech © 2026",
};

/** Portal display: HK Tech platform brand with optional tenant overrides in body only */
export function getPortalBrand(company) {
  return {
    ...HK_TECH_BRAND,
    logo_url: HK_TECH_BRAND.logoUrl,
    name: HK_TECH_BRAND.name,
    tagline: HK_TECH_BRAND.tagline,
    tenantName: company?.name || null,
  };
}

/** PDF / reports: HK Tech letterhead; tenant shown as client when provided */
export function getPdfBrand(company) {
  return {
    ...HK_TECH_BRAND,
    logo_url: HK_TECH_BRAND.logoUrl,
    platformName: HK_TECH_BRAND.name,
    clientName: company?.name && company.name !== HK_TECH_BRAND.name ? company.name : null,
    address: HK_TECH_BRAND.address,
    phone: HK_TECH_BRAND.phone,
    email: HK_TECH_BRAND.email,
  };
}
