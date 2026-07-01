import { MetadataRoute } from 'next';

const languages = ['en', 'ko', 'ja', 'es', 'de', 'fr'];
const routes = ['', '/input-destiny', '/pricing', '/sync'];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://k-destiny.com';
  
  const entries: MetadataRoute.Sitemap = [];

  languages.forEach((lang) => {
    routes.forEach((route) => {
      entries.push({
        url: `${baseUrl}/${lang}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority: route === '' ? 1 : 0.8,
      });
    });
  });

  // Add root
  entries.push({
    url: `${baseUrl}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  });

  return entries;
}
