import unicodedata

def normalize_string(value):
    """Nettoie une chaîne : trim, minuscules, sans accents."""
    if not isinstance(value, str):
        return value
    value = value.strip().lower()
    value = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode("utf-8")
    return value

def normalize_int(value):
    """Convertit en entier si possible."""
    try:
        return int(value)
    except:
        return None

def normalize_float(value):
    """Convertit en float si possible."""
    try:
        return float(value)
    except:
        return None

def normalize_arrondissement(value):
    """Convertit '15e', '75015', '15' → 15."""
    if value is None:
        return None
    value = str(value)
    value = value.replace("e", "").replace("er", "").replace("ème", "")
    try:
        return int(value[-2:]) if len(value) >= 2 else int(value)
    except:
        return None
