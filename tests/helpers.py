"""Utilidades de prueba: carga de respuestas CMR grabadas (sin red)."""
import json
from pathlib import Path

FIXTURES = Path(__file__).parent / 'fixtures'


def cargar(nombre):
    return json.loads((FIXTURES / nombre).read_text(encoding='utf-8'))


def cargar_texto(nombre):
    return (FIXTURES / nombre).read_text(encoding='utf-8')
