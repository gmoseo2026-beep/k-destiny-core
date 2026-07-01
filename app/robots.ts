import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/chat'], // Prevent crawling of private/dynamic pages
    },
    sitemap: 'https://k-destiny.com/sitemap.xml',
  };
}
