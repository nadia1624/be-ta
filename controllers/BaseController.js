class BaseController {
    constructor() {
        // Bind methods to 'this' to avoid context issues when used in routes
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        methods.forEach(method => {
            if (method !== 'constructor' && typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            }
        });
    }

    sendResponse(res, statusCode, success, message, data = null) {
        const response = { success, message };
        if (data !== null) response.data = data;
        return res.status(statusCode).json(response);
    }

    sendError(res, error, customMessage = 'Terjadi kesalahan server') {
        console.error(`[${this.constructor.name}] Error:`, error);
        return this.sendResponse(res, 500, false, error.message || customMessage);
    }
}

module.exports = BaseController;
