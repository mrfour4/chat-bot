export async function messageFrom(
    response: Response,
    fallback: string,
): Promise<string> {
    const body = await response.json().catch(() => null);
    return body?.message ?? fallback;
}

export async function expectOk(response: Response, fallback: string) {
    if (!response.ok) throw new Error(await messageFrom(response, fallback));
    return response;
}
