/**
 * Makes a fetch request with a timeout.
 * @param url - The URL to fetch
 * @param timeout - Timeout in milliseconds
 * @param options - Additional fetch options
 * @returns Promise that resolves to the Response
 * @throws Error if the request times out or fails
 */
export async function fetchWithTimeout(
  url: string,
  timeout: number,
  options?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
