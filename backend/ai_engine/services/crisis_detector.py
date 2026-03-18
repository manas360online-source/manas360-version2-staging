"""
Crisis keyword detector for patient speech.
Supports English and Hindi keywords.
"""

# Crisis keywords (English + Hindi)
CRISIS_KEYWORDS = {
    'english': [
        'suicide', 'kill myself', 'end my life', 'want to die',
        'self-harm', 'cut myself', 'hurt myself', 'self harm',
        'no reason to live', 'better off dead', 'overdose',
        "can't go on", 'no point living', 'give up on life',
        'end it all', 'end everything', 'take my life',
        'not worth living', 'worthless', 'hopeless',
        'nobody cares', 'everyone would be better without me',
    ],
    'hindi': [
        'आत्महत्या', 'खुद को मार', 'जीवन समाप्त',
        'मरना चाहता', 'खुद को चोट', 'खुद को खत्म',
        'जीना नहीं चाहता', 'जिंदगी बेकार', 'खुद को नुकसान',
    ],
}

# Severity tiers
HIGH_SEVERITY = [
    'suicide', 'kill myself', 'end my life', 'want to die',
    'take my life', 'end it all', 'end everything',
    'आत्महत्या', 'खुद को मार', 'जीवन समाप्त',
]


async def detect_crisis(text: str) -> dict:
    """
    Detect crisis keywords in patient speech.

    Returns a dict with:
      detected (bool), keywords (list[str]),
      severity ('high'|'medium'|'low'), confidence (float)
    """
    text_lower = text.lower()
    detected_keywords: list[str] = []
    high_severity_hit = False

    for kw in CRISIS_KEYWORDS['english']:
        if kw in text_lower:
            detected_keywords.append(kw)
            if kw in HIGH_SEVERITY:
                high_severity_hit = True

    for kw in CRISIS_KEYWORDS['hindi']:
        if kw in text:
            detected_keywords.append(kw)
            if kw in HIGH_SEVERITY:
                high_severity_hit = True

    if detected_keywords:
        severity = 'high' if high_severity_hit else 'medium'
        return {
            'detected': True,
            'keywords': detected_keywords,
            'severity': severity,
            'confidence': 0.95,
        }

    return {
        'detected': False,
        'keywords': [],
        'severity': 'low',
        'confidence': 0.0,
    }
