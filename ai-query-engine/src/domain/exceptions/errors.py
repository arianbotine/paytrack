class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class UnauthorizedError(AppError):
    def __init__(self, message: str = 'Unauthorized'):
        super().__init__(message=message, status_code=401)


class ValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=400)


class UnsafeSQLError(AppError):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=400)


class ExternalProviderError(AppError):
    def __init__(self, message: str = 'External provider failed'):
        super().__init__(message=message, status_code=502)
