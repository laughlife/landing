const generations = new Map<string, number>()

export function cacheVersion(scope: string): number {
  return generations.get(scope) ?? 0
}
export function invalidateCache(...scopes: string[]): void {
  for (const scope of scopes) generations.set(scope, cacheVersion(scope) + 1)
}

export function cacheKey(scope: string, suffix = ''): string {
  return `portal:${scope}:v${cacheVersion(scope)}:${suffix}`
}
