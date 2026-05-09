"""
5-Why depth level tracker.
Analyses conversation transcript to estimate therapeutic depth.
"""

# Words that signal the patient is going deeper
DEPTH_WORDS = {
    'L2': ['because', 'trigger', 'made me', 'happened when', 'started when', 'whenever'],
    'L3': ['pattern', 'always', 'never', 'keep', 'used to', 'tendency', 'habit'],
    'L4': ['believe', 'think i am', 'feel like i', 'childhood', 'growing up', 'parents', 'core'],
    'L5': ['root', 'origin', 'deep down', 'fundamental', 'really about', 'true reason'],
}

WHY_PHRASES = ['why', 'what causes', 'what makes', 'what leads', 'tell me more about', 'explore']


async def track_depth_level(transcript: list[dict]) -> str:
    """
    Infer the current 5-Why depth level from the transcript.

    Returns 'L1' (surface) through 'L5' (root cause).
    """
    if not transcript:
        return 'L1'

    recent = transcript[-12:]

    # Count therapist why-style probes
    why_count = sum(
        1 for t in recent
        if t.get('speaker') == 'therapist'
        and any(p in t.get('text', '').lower() for p in WHY_PHRASES)
    )

    # Count patient depth signals
    patient_lines = [t.get('text', '').lower() for t in recent if t.get('speaker') == 'patient']
    combined = ' '.join(patient_lines)

    l5_hits = sum(1 for w in DEPTH_WORDS['L5'] if w in combined)
    l4_hits = sum(1 for w in DEPTH_WORDS['L4'] if w in combined)
    l3_hits = sum(1 for w in DEPTH_WORDS['L3'] if w in combined)
    l2_hits = sum(1 for w in DEPTH_WORDS['L2'] if w in combined)

    if l5_hits >= 1 or why_count >= 4:
        return 'L5'
    if l4_hits >= 2 or why_count >= 3:
        return 'L4'
    if l3_hits >= 2 or (l4_hits >= 1 and why_count >= 2):
        return 'L3'
    if l2_hits >= 2 or why_count >= 1:
        return 'L2'
    return 'L1'
