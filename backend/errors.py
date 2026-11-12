"""Errores de dominio. main.py los traduce a respuestas HTTP con cuerpo {"detail": mensaje}."""


class ApiError(Exception):
    """Error base: lleva el código HTTP y un mensaje en español para el usuario."""

    status = 500

    def __init__(self, detail):
        super().__init__(detail)
        self.detail = detail


class InvalidInput(ApiError):
    status = 422


class NotFound(ApiError):
    status = 404


class ServiceUnavailable(ApiError):
    """Función no disponible por configuración (p. ej. falta el token de Earthdata)."""

    status = 503


class UpstreamError(ApiError):
    """Falla de un servicio externo (CMR, ASF). Nunca se sustituyen datos en silencio."""

    status = 502
