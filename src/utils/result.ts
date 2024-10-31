export class ErrCtx extends Error {
    constructor(ctx: string, val: string) {
        super(`${ctx}: ${val}`);
    }
}
