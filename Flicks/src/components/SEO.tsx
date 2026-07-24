import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  type?: string;
  name?: string;
}

export default function SEO({ title, description, type, name }: SEOProps) {
  const defaultTitle = 'Flicks - Your Ultimate Movie Stash';
  const defaultDescription = 'Discover, track, and watch your favorite movies and TV shows on Flicks. The ultimate movie stash for entertainment lovers.';
  const defaultType = 'website';
  const defaultName = 'Flicks';

  const siteTitle = title ? `${title} | ${defaultName}` : defaultTitle;
  const siteDescription = description || defaultDescription;
  const siteType = type || defaultType;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{siteTitle}</title>
      <meta name='description' content={siteDescription} />
      
      {/* Open Graph tags */}
      <meta property="og:type" content={siteType} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      
      {/* Twitter tags */}
      <meta name="twitter:creator" content={name || defaultName} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
    </Helmet>
  );
}
