export const getSubdomain = () => {
  const host = window.location.hostname;
  const parts = host.split('.');
  
  // Handle localhost (e.g., aemje.localhost)
  if (host.includes('localhost')) {
    if (parts.length > 1) return parts[0];
    return null;
  }
  
  // Handle production (e.g., aemje.interiorapp.com)
  if (parts.length > 2) {
    return parts[0];
  }
  
  return null;
};

export const getTenantHeader = () => {
  const subdomain = getSubdomain();
  return subdomain ? { 'X-Tenant-Subdomain': subdomain } : {};
};
