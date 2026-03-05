import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product";
  product?: {
    name: string;
    description?: string;
    image?: string;
    price?: number;
    currency?: string;
    sku?: string;
    brand?: string;
    category?: string;
    availability?: "InStock" | "OutOfStock" | "LimitedAvailability";
  };
  noindex?: boolean;
}

const SITE_NAME = "Realtech Computer";
const DEFAULT_DESCRIPTION = "Shop MacBooks, portable monitors, and tech accessories at Realtech Computer. Best prices in Cambodia with warranty and fast delivery.";
const DEFAULT_IMAGE = "https://realtechcomputer.com/assets/images/Realtech.png";
const SITE_URL = "https://realtechcomputer.com";

export const SEOHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  product,
  noindex = false,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - MacBook & Portable Monitor Store`;
  const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  useEffect(() => {
    // Set document title
    document.title = fullTitle;

    // Update meta tags
    setMeta("description", description);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");

    // Open Graph
    setMetaProperty("og:title", fullTitle);
    setMetaProperty("og:description", description);
    setMetaProperty("og:image", image);
    setMetaProperty("og:url", pageUrl);
    setMetaProperty("og:type", type === "product" ? "product" : "website");
    setMetaProperty("og:site_name", SITE_NAME);

    // Twitter
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = pageUrl;

    // JSON-LD structured data
    removeJsonLd();
    if (product) {
      addJsonLd(buildProductJsonLd(product, pageUrl));
    } else {
      addJsonLd(buildWebsiteJsonLd());
    }

    return () => {
      removeJsonLd();
    };
  }, [fullTitle, description, image, pageUrl, type, product, noindex]);

  return null;
};

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function removeJsonLd() {
  document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
}

function addJsonLd(data: object) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo-jsonld", "true");
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": SITE_NAME,
    "description": "MacBook & Portable Monitor Store in Cambodia",
    "url": SITE_URL,
    "logo": DEFAULT_IMAGE,
    "sameAs": [],
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function buildProductJsonLd(product: NonNullable<SEOHeadProps["product"]>, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || "",
    "image": product.image || DEFAULT_IMAGE,
    "url": url,
    "sku": product.sku || "",
    "brand": product.brand ? { "@type": "Brand", "name": product.brand } : undefined,
    "category": product.category || "",
    "offers": {
      "@type": "Offer",
      "price": product.price || 0,
      "priceCurrency": product.currency || "USD",
      "availability": `https://schema.org/${product.availability || "InStock"}`,
      "seller": {
        "@type": "Organization",
        "name": SITE_NAME,
      },
    },
  };
}
