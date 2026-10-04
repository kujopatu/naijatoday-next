export type SocialLinks = {
  facebook: string;
  twitter: string;
  instagram: string;
  youtube: string;
  whatsapp: string;
  tiktok: string;
  telegram: string;
  threads: string;
  linkedin: string;
  snapchat: string;
};

export const SOCIAL_LINKS_DEFAULTS: SocialLinks = {
  facebook: 'https://www.facebook.com/naijatodayblog',
  twitter: 'https://x.com/naijatodayblog',
  instagram: 'https://www.instagram.com/naijatodayblog',
  youtube: 'https://www.youtube.com/@naijatodayblog',
  whatsapp: 'https://whatsapp.com/channel/0029VbDb83YFsn0iiMnjpN2J',
  tiktok: 'https://www.tiktok.com/@naijatodayblog',
  telegram: 'https://t.me/naijatodayblog',
  threads: '',
  linkedin: '',
  snapchat: '',
};

export const SOCIAL_PLATFORM_META: {
  key: keyof SocialLinks;
  label: string;
  color: string;
  placeholder: string;
  emoji: string;
}[] = [
  { key: 'facebook', label: 'Facebook', color: '#1877F2', placeholder: 'https://www.facebook.com/yourpage', emoji: '📘' },
  { key: 'twitter', label: 'Twitter / X', color: '#000000', placeholder: 'https://x.com/yourhandle', emoji: '✖️' },
  { key: 'instagram', label: 'Instagram', color: '#E1306C', placeholder: 'https://www.instagram.com/yourhandle', emoji: '📷' },
  { key: 'youtube', label: 'YouTube', color: '#FF0000', placeholder: 'https://www.youtube.com/@yourchannel', emoji: '▶️' },
  { key: 'whatsapp', label: 'WhatsApp Channel', color: '#25D366', placeholder: 'https://whatsapp.com/channel/yourlink', emoji: '💬' },
  { key: 'telegram', label: 'Telegram', color: '#2AABEE', placeholder: 'https://t.me/yourchannel', emoji: '✈️' },
  { key: 'tiktok', label: 'TikTok', color: '#010101', placeholder: 'https://www.tiktok.com/@yourhandle', emoji: '🎵' },
  { key: 'threads', label: 'Threads', color: '#000000', placeholder: 'https://www.threads.net/@yourhandle', emoji: '🧵' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', placeholder: 'https://www.linkedin.com/company/yourpage', emoji: '💼' },
  { key: 'snapchat', label: 'Snapchat', color: '#FFFC00', placeholder: 'https://www.snapchat.com/add/yourhandle', emoji: '👻' },
];
