import React from 'react';

interface CdnAssetProps {
  src: string;
  children: React.ReactElement<{ src: string }>;
}

const CdnAsset: React.FC<CdnAssetProps> = ({ src, children }) => {
  const cdnBase = import.meta.env.VITE_CDN_BASE_URL;
  const finalSrc = import.meta.env.PROD && cdnBase ? `${cdnBase}${src}` : src;
  return React.cloneElement(children, { src: finalSrc });
};

export default CdnAsset;
