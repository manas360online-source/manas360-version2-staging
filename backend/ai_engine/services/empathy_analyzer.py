"""
Empathy analyser – uses Anthropic Claude to score therapeutic empathy
from a rolling transcript window every 30 seconds.
"""

import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

EMPATHY_PROMPT = """You are an expert clinical supervisor analysing therapeutic empathy in real-time.

Analyse this therapy conversation snippet and score the therapist's empathy.

SCORING CRITERIA (each 0-100):

1. empathyScore   – Overall therapeutic empathy
   (active listening, validation, non-judgement, patient feeling heard)

2. therapistTone  – Warmth, calmness, professional care, appropriate pacing

3. patientSentiment – Patient's emotional state
   (0 = severely distressed, 50 = neutral, 100 = positive/hopeful)

4. emotionalResonance – Therapist matching / acknowledging patient's emotions

CONVERSATION TRANSCRIPT:
{transcript}

Respond with ONLY valid JSON, no markdown, no explanation:
{{
  "empathyScore": <0-100>,
  "therapistTone": <0-100>,
  "patientSentiment": <0-100>,
  "emotionalResonance": <0-100>,
  "reasoning": "<one sentence>"
}}"""


async def analyze_empathy(transcript_window: list[dict]) -> int:
    """
    Analyse the last N transcript segments and return an empathy score (0-100).

    Falls back to a heuristic score if the API is unavailable.
    """
    api_key = os.getenv('ANTHROPIC_API_KEY') or os.getenv('CLAUDE_API_KEY')
    if not api_key or not transcript_window:
        return _heuristic_empathy(transcript_window)

    try:
        import anthropic  # lazy import

        formatted = '\n'.join(
            f"[{seg.get('speaker', 'unknown').upper()}]: {seg.get('text', '')}"
            for seg in transcript_window
        )
        prompt = EMPATHY_PROMPT.format(transcript=formatted)

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=os.getenv('CLAUDE_MODEL', 'claude-sonnet-4-5'),
            max_tokens=256,
            messages=[{'role': 'user', 'content': prompt}],
        )

        raw = message.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]

        data = json.loads(raw)
        return int(data.get('empathyScore', 50))

    except Exception as exc:
        logger.warning('Empathy analysis error: %s – using heuristic', exc)
        return _heuristic_empathy(transcript_window)


def _heuristic_empathy(transcript_window: list[dict]) -> int:
    """Simple keyword-based fallback empathy score."""
    if not transcript_window:
        return 50

    positive_kws = [
        'understand', 'hear you', 'makes sense', "that's valid", 'absolutely',
        'of course', 'thank you for sharing', 'appreciate', 'tell me more',
        'sounds like', 'feel', 'sounds difficult',
    ]
    therapist_lines = [
        seg.get('text', '').lower()
        for seg in transcript_window
        if seg.get('speaker') == 'therapist'
    ]
    combined = ' '.join(therapist_lines)
    hits = sum(1 for kw in positive_kws if kw in combined)
    # Base of 50 + up to 40 for positive cues
    return min(90, 50 + hits * 5)
