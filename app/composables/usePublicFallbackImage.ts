export const PUBLIC_FALLBACK_IMAGE = '/wuyue.png'

export function usePublicFallbackImage() {
  return useState<string>('public:fallback-image', () => PUBLIC_FALLBACK_IMAGE)
}
