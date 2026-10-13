export function supportsPictureInPicture(enabled: boolean, requestPictureInPicture: unknown): boolean {
  return enabled && typeof requestPictureInPicture === 'function';
}
