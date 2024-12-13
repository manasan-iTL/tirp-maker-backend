export class ApiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ApiError"
        Object.setPrototypeOf(this, ApiError.prototype); // 必須: TypeScriptでエラーオブジェクトを正しく継承
    }
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError"
        Object.setPrototypeOf(this, ValidationError.prototype); // 必須: TypeScriptでエラーオブジェクトを正しく継承
    }
}

export class NotFoundThemeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotFoundThemeError"
        Object.setPrototypeOf(this, NotFoundThemeError.prototype); // 必須: TypeScriptでエラーオブジェクトを正しく継承
    }
}

export class NotFoundRoutesError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotFoundRoutesError"
        Object.setPrototypeOf(this, NotFoundRoutesError.prototype); // 必須: TypeScriptでエラーオブジェクトを正しく継承
    }
}

export class ApiRateLimit extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ApiRateLimit"
        Object.setPrototypeOf(this, ApiRateLimit.prototype); // 必須: TypeScriptでエラーオブジェクトを正しく継承
    }
}