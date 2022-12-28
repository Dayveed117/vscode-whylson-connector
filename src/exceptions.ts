// https://stackoverflow.com/questions/41102060/typescript-extending-error-class
// https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
// TODO : Extend Error Classes

export class LigoPathNotFound extends Error {}
export class LigoBadCompilation extends Error {}
export class WhylsonNotFound extends Error {}
export class WhylsonRuntimeError extends Error {}
