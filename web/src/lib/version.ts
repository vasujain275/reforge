declare const __APP_VERSION__: string

/**
 * Get the application version from package.json
 * @returns The version string with 'v' prefix (e.g., 'v0.1.4')
 */
export function getAppVersion(): string {
  return `v${__APP_VERSION__ || '0.0.0'}`
}
