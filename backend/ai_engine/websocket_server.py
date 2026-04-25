"""
MANAS360 Therapeutic GPS – AI Engine WebSocket Server
======================================================
Receives Base64-encoded raw PCM audio chunks from the Jitsi
therapist-mode client, runs real-time STT + NLP analysis, and
broadcasts GPS metrics back to the therapist's WebSocket connection.

Architecture
------------
  Jitsi (therapist) ──audio_chunk──► [this server]
                                         │  STT (Whisper)
                                         │  Empathy (Claude)
                                         │  Crisis detector
                                         │  5-Why depth tracker
  Jitsi (therapist) ◄──gps_update──────┘

Message protocol (JSON):
  Client → Server
    { "type": "init",        "sessionId": "...", "userRole": "therapist|patient",
                             "jwtToken": "...",  "patientId": "..." }
    { "type": "audio_chunk", "sessionId": "...", "timestamp": ms,
                             "audio": "<base64 float32 PCM>" }
    { "type": "ping" }

  Server → Client
    { "type": "connected",   "sessionId": "...", "userRole": "..." }
    { "type": "gps_update",  "metrics": { ... } }
    { "type": "crisis_alert","alert":   { ... } }
    { "type": "pong" }
    { "type": "error",       "message": "..." }
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import time
from collections import defaultdict
from datetime import datetime
from typing import Optional

import numpy as np
import aiohttp
import websockets
from dotenv import load_dotenv

from services.crisis_detector import detect_crisis
from services.depth_tracker import track_depth_level
from services.empathy_analyzer import analyze_empathy
from services.whisper_stt import transcribe_audio

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s – %(message)s',
)
logger = logging.getLogger('ai_engine')

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
HOST = os.getenv('AI_ENGINE_HOST', '0.0.0.0')
PORT = int(os.getenv('AI_ENGINE_PORT', '8765'))
NODE_API_URL = os.getenv('NODE_API_URL', 'http://localhost:3000/api')
AI_ENGINE_SECRET = os.getenv('AI_ENGINE_SECRET', '')

# Audio chunk buffer flush interval (seconds)
AUDIO_FLUSH_INTERVAL = 1.0
# Empathy analysis window (seconds of audio to analyse together)
EMPATHY_WINDOW_SECS = 30
# GPS broadcast interval (seconds)
GPS_BROADCAST_INTERVAL = 30

SAMPLE_RATE = 16000  # Hz expected from client

# ---------------------------------------------------------------------------
# In-memory session registry
# ---------------------------------------------------------------------------
# sessions[session_id] = {
#   'processor': TherapySessionProcessor,
#   'therapist_ws': websocket | None,
#   'patient_ws': websocket | None,
# }
sessions: dict[str, dict] = {}


async def push_to_node(session_id: str, monitoring_id: str, payload: dict) -> None:
    """Forward GPS updates/crisis alerts to Node API for persistence + socket relay."""
    if not monitoring_id:
        return

    url = NODE_API_URL.rstrip('/') + '/v1/gps/internal/push'
    body = {
        'sessionId': session_id,
        'monitoringId': monitoring_id,
        'type': payload.get('type'),
        'data': payload.get('metrics') if payload.get('type') == 'gps_update' else payload.get('alert'),
    }
    headers = {'Content-Type': 'application/json'}
    if AI_ENGINE_SECRET:
        headers['x-ai-engine-secret'] = AI_ENGINE_SECRET

    try:
        async with aiohttp.ClientSession() as client:
            async with client.post(url, json=body, headers=headers, timeout=4) as resp:
                if resp.status >= 300:
                    logger.warning('[%s] internal push failed: status=%s', session_id, resp.status)
    except Exception as exc:
        logger.warning('[%s] internal push error: %s', session_id, exc)

# ---------------------------------------------------------------------------
# Per-session processor
# ---------------------------------------------------------------------------

class TherapySessionProcessor:
    """Maintains running state for a single therapy session."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.transcript: list[dict] = []
        self.sentiment_history: list[dict] = []
        self.empathy_score: int = 50
        self.depth_level: str = 'L1'
        self.crisis_risk: str = 'low'
        self.current_topic: str = ''
        self.ai_suggestion: str = ''
        self._last_gps_broadcast: float = 0.0
        self._audio_buffer: list[np.ndarray] = []

    # ------------------------------------------------------------------
    def _buffer_audio(self, audio_array: np.ndarray) -> None:
        self._audio_buffer.append(audio_array)

    def _flush_audio_buffer(self) -> Optional[np.ndarray]:
        if not self._audio_buffer:
            return None
        combined = np.concatenate(self._audio_buffer)
        self._audio_buffer.clear()
        return combined

    # ------------------------------------------------------------------
    async def process_audio_chunk(self, audio_b64: str) -> Optional[dict]:
        """
        Decode, transcribe, and analyse an audio chunk.
        Returns a GPS update / crisis alert dict or None if no update yet.
        """
        try:
            audio_bytes = base64.b64decode(audio_b64)
            audio_array = np.frombuffer(audio_bytes, dtype=np.float32).copy()
        except Exception as exc:
            logger.warning('[%s] Failed to decode audio: %s', self.session_id, exc)
            return None

        self._buffer_audio(audio_array)

        # Only transcribe when we have enough buffered audio
        combined = self._flush_audio_buffer()
        if combined is None or len(combined) < SAMPLE_RATE:
            # Less than 1 second – accumulate more
            return None

        # ── Speech-to-Text ──────────────────────────────────────────────
        text = await transcribe_audio(combined)
        if not text:
            return None

        # ── Crisis detection (immediate) ─────────────────────────────────
        crisis = await detect_crisis(text)
        if crisis['detected']:
            self.crisis_risk = 'high'
            logger.warning('[%s] CRISIS detected: %s', self.session_id, crisis['keywords'])
            return {
                'type': 'crisis_alert',
                'alert': {
                    'message': 'Crisis-related language detected in patient speech.',
                    'keywords': crisis['keywords'],
                    'severity': crisis['severity'],
                    'confidence': crisis['confidence'],
                    'timestamp': datetime.utcnow().isoformat(),
                },
            }

        # ── Append to rolling transcript ─────────────────────────────────
        self.transcript.append({
            'timestamp': datetime.utcnow().isoformat(),
            'speaker': 'patient',
            'text': text,
        })

        # Only broadcast GPS every GPS_BROADCAST_INTERVAL seconds
        now = time.monotonic()
        if now - self._last_gps_broadcast < GPS_BROADCAST_INTERVAL:
            return None

        self._last_gps_broadcast = now

        # ── Empathy analysis ─────────────────────────────────────────────
        self.empathy_score = await analyze_empathy(self.transcript[-10:])

        # ── Depth tracking ───────────────────────────────────────────────
        self.depth_level = await track_depth_level(self.transcript)

        # ── Sentiment (simple heuristic) ─────────────────────────────────
        sentiment_score = _simple_sentiment(text)
        self.sentiment_history.append({
            'timestamp': time.time(),
            'score': sentiment_score,
        })

        # ── Derive crisis risk from empathy + sentiment ───────────────────
        if self.empathy_score < 30 or sentiment_score < -0.7:
            self.crisis_risk = 'medium'
        else:
            self.crisis_risk = 'low'

        # ── AI coaching suggestion ────────────────────────────────────────
        self.ai_suggestion = _coaching_suggestion(
            self.empathy_score, self.depth_level, self.crisis_risk
        )

        return {
            'type': 'gps_update',
            'metrics': {
                'empathyScore': self.empathy_score,
                'depthLevel': self.depth_level,
                'sentiment': 'positive' if sentiment_score > 0.1 else (
                    'negative' if sentiment_score < -0.1 else 'neutral'
                ),
                'sentimentScore': sentiment_score,
                'crisisRisk': self.crisis_risk,
                'currentTopic': self.current_topic,
                'aiSuggestion': self.ai_suggestion,
                'transcriptSnippet': text[:200],
                'timestamp': datetime.utcnow().isoformat(),
            },
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _simple_sentiment(text: str) -> float:
    """
    Coarse keyword-based sentiment score in [-1, 1].
    Replace with a real NLP model in production.
    """
    pos_kws = ['happy', 'better', 'hopeful', 'grateful', 'good', 'great',
               'okay', 'improve', 'progress', 'calm', 'safe', 'relief']
    neg_kws = ['sad', 'hopeless', 'anxious', 'afraid', 'pain', 'hurt',
               'depressed', 'angry', 'overwhelmed', 'lost', 'scared', 'alone']
    tl = text.lower()
    pos = sum(1 for w in pos_kws if w in tl)
    neg = sum(1 for w in neg_kws if w in tl)
    total = pos + neg
    if total == 0:
        return 0.0
    return round((pos - neg) / total, 3)


def _coaching_suggestion(empathy: int, depth: str, crisis: str) -> str:
    if crisis == 'high':
        return '🔴 CRISIS: Follow safety protocol immediately.'
    if empathy < 40:
        return '🔴 Empathy low – pause and check in with the patient\'s feelings.'
    if empathy < 60:
        return '🟡 Consider validating the patient\'s experience with a reflection.'
    if depth in ('L1', 'L2'):
        return '💡 Patient is at surface level – try open-ended "why" questions to go deeper.'
    if depth == 'L5':
        return '🟢 Excellent depth – patient is exploring root causes. Stay curious.'
    return '🟢 Session is progressing well. Keep going.'


# ---------------------------------------------------------------------------
# WebSocket handler
# ---------------------------------------------------------------------------

async def handle_connection(websocket: websockets.WebSocketServerProtocol) -> None:
    session_id: Optional[str] = None
    user_role: Optional[str] = None

    try:
        async for raw_message in websocket:
            try:
                data = json.loads(raw_message)
            except json.JSONDecodeError:
                await websocket.send(json.dumps({'type': 'error', 'message': 'Invalid JSON'}))
                continue

            msg_type = data.get('type')

            # ── ping ──────────────────────────────────────────────────────
            if msg_type == 'ping':
                await websocket.send(json.dumps({'type': 'pong'}))
                continue

            # ── init ──────────────────────────────────────────────────────
            if msg_type == 'init':
                session_id = str(data.get('sessionId', ''))
                user_role = str(data.get('userRole', 'patient'))
                monitoring_id = str(data.get('monitoringId', '') or '')

                if not session_id:
                    await websocket.send(json.dumps({'type': 'error', 'message': 'sessionId required'}))
                    continue

                if session_id not in sessions:
                    sessions[session_id] = {
                        'processor': TherapySessionProcessor(session_id),
                        'therapist_ws': None,
                        'patient_ws': None,
                    }

                if user_role == 'therapist':
                    sessions[session_id]['therapist_ws'] = websocket
                    sessions[session_id]['monitoring_id'] = monitoring_id
                else:
                    sessions[session_id]['patient_ws'] = websocket

                logger.info('[%s] %s connected', session_id, user_role)
                await websocket.send(json.dumps({
                    'type': 'connected',
                    'sessionId': session_id,
                    'userRole': user_role,
                }))
                continue

            # ── audio_chunk ───────────────────────────────────────────────
            if msg_type == 'audio_chunk':
                if session_id not in sessions:
                    await websocket.send(json.dumps({'type': 'error', 'message': 'Not initialised'}))
                    continue

                audio_b64 = data.get('audio', '')
                processor: TherapySessionProcessor = sessions[session_id]['processor']
                result = await processor.process_audio_chunk(audio_b64)

                if result:
                    monitoring_id = str(sessions[session_id].get('monitoring_id') or '')
                    await push_to_node(session_id, monitoring_id, result)

                    # Send ONLY to therapist WebSocket
                    therapist_ws = sessions[session_id].get('therapist_ws')
                    if therapist_ws and therapist_ws.open:
                        await therapist_ws.send(json.dumps(result))
                continue

            await websocket.send(json.dumps({'type': 'error', 'message': f'Unknown type: {msg_type}'}))

    except websockets.exceptions.ConnectionClosed:
        logger.info('[%s] %s disconnected', session_id, user_role)

    finally:
        # Cleanup session entry when both sides disconnect
        if session_id and session_id in sessions:
            if user_role == 'therapist':
                sessions[session_id]['therapist_ws'] = None
            elif user_role == 'patient':
                sessions[session_id]['patient_ws'] = None

            has_therapist = sessions[session_id].get('therapist_ws') is not None
            has_patient = sessions[session_id].get('patient_ws') is not None
            if not has_therapist and not has_patient:
                del sessions[session_id]
                logger.info('[%s] Session cleaned up', session_id)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    logger.info('Starting AI Engine WebSocket server on ws://%s:%d', HOST, PORT)
    async with websockets.serve(handle_connection, HOST, PORT):
        await asyncio.Future()  # run forever


if __name__ == '__main__':
    asyncio.run(main())
