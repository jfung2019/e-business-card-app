type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setAccessTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter;
}

export async function getAccessToken(): Promise<string | null> {
  if (!tokenGetter) {
    return null;
  }
  return tokenGetter();
}
