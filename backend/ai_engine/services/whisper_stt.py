"""
Speech-to-text service using the OpenAI Whisper API.
Accepts raw PCM Float32 audio and returns a transcript string.
"""

import os
import io
import wave
import struct
import asyncio
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

SAMPLE_RATE = 16000  # Hz – Whisper expects 16 kHz


def _pcm_float32_to_wav_bytes(audio_array: np.ndarray, sample_rate: int = SAMPLE_RATE) -> bytes:
    """Convert a float32 numpy array to WAV bytes (16-bit PCM)."""
    # Clamp and convert to int16
    int16_data = (np.clip(audio_array, -1.0, 1.0) * 32767).astype(np.int16)

    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit = 2 bytes
        wf.setframerate(sample_rate)
        wf.writeframes(int16_data.tobytes())

    return buf.getvalue()


async def transcribe_audio(audio_array: np.ndarray, language: Optional[str] = None) -> str:
    """
    Transcribe a float32 PCM audio array using the OpenAI Whisper API.

    Args:
        audio_array: 1-D numpy float32 array of audio samples.
        language:    Optional BCP-47 language hint (e.g. 'en', 'hi').

    Returns:
        Transcribed text, or an empty string if nothing was transcribed.
    """
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        logger.warning('OPENAI_API_KEY not set – returning empty transcript')
        return ''

    if audio_array is None or len(audio_array) == 0:
        return ''

    try:
        import openai  # lazy import – only needed at runtime

        client = openai.AsyncOpenAI(api_key=api_key)

        wav_bytes = _pcm_float32_to_wav_bytes(audio_array)
        audio_file = io.BytesIO(wav_bytes)
        audio_file.name = 'audio.wav'

        kwargs: dict = {
            'model': 'whisper-1',
            'file': audio_file,
            'response_format': 'text',
        }
        if language:
            kwargs['language'] = language

        # Run blocking openai call in thread-pool to stay async-safe
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: asyncio.run(_async_transcribe(client, kwargs))
        )
        return (result or '').strip()

    except Exception as exc:
        logger.error('Whisper transcription error: %s', exc)
        return ''


async def _async_transcribe(client, kwargs: dict) -> str:
    """Inner coroutine that actually calls the Whisper API."""
    resp = await client.audio.transcriptions.create(**kwargs)
    if isinstance(resp, str):
        return resp
    return getattr(resp, 'text', '') or ''
