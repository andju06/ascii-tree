const SLUG = /^[a-z0-9]{8}$/;

export function isSpaceSlug(value: string): boolean {
  return SLUG.test(value);
}
