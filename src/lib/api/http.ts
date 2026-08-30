/**
 * Reads the API's own Vietnamese message off a failed response.
 *
 * Every route in this app answers a failure with `{ code, message }`, and that
 * message is written for the person reading it. Restating it in the client
 * would produce a vaguer sentence from further away.
 */
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
