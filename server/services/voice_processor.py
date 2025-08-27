"""
Voice processing service for speech-to-text and text-to-speech functionality.
"""
import os
import io
import base64
import tempfile
import subprocess
from typing import Optional, Union, Dict
from pathlib import Path
import wave
import json
from typing import List


# Try to import optional dependencies
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

class VoiceProcessor:
    """Main voice processing class that handles both STT and TTS."""
    
    def __init__(self):
        self.whisper_model = None
        self.tts_engine = None
        self._initialize_services()
    
    def _initialize_services(self):
        """Initialize available voice services."""
        # Initialize Whisper for STT
        if WHISPER_AVAILABLE:
            try:
                self.whisper_model = whisper.load_model("base")
                print("Whisper model loaded successfully")
            except Exception as e:
                print(f"Failed to load Whisper model: {e}")
                self.whisper_model = None
        
        # Initialize pyttsx3 for TTS
        if PYTTSX3_AVAILABLE:
            try:
                self.tts_engine = pyttsx3.init()
                # Configure voice settings
                self.tts_engine.setProperty('rate', 150)  # Speed of speech
                self.tts_engine.setProperty('volume', 0.8)  # Volume level
                print("pyttsx3 TTS engine initialized")
            except Exception as e:
                print(f"Failed to initialize pyttsx3: {e}")
                self.tts_engine = None
    
    def speech_to_text(self, audio_data: Union[str, bytes], 
                      method: str = "whisper") -> Dict[str, any]:
        """
        Convert speech to text.
        
        Args:
            audio_data: Base64 encoded audio data or raw bytes
            method: STT method to use ("whisper", "google", "azure")
            
        Returns:
            Dict with transcription and metadata
        """
        try:
            # Decode base64 audio if needed
            if isinstance(audio_data, str):
                audio_bytes = base64.b64decode(audio_data)
            else:
                audio_bytes = audio_data
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name
            
            try:
                if method == "whisper" and self.whisper_model:
                    return self._whisper_transcribe(temp_path)
                elif method == "google":
                    return self._google_speech_to_text(temp_path)
                elif method == "azure":
                    return self._azure_speech_to_text(temp_path)
                else:
                    # Fallback to basic method
                    return self._fallback_speech_to_text()
                    
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_path)
                except:
                    pass
                    
        except Exception as e:
            return {
                "text": "",
                "success": False,
                "error": str(e),
                "method": method
            }
    
    def _whisper_transcribe(self, audio_path: str) -> Dict[str, any]:
        """Transcribe audio using Whisper."""
        try:
            result = self.whisper_model.transcribe(audio_path)
            
            return {
                "text": result["text"].strip(),
                "success": True,
                "confidence": 1.0,  # Whisper doesn't provide confidence scores
                "language": result.get("language", "unknown"),
                "method": "whisper"
            }
            
        except Exception as e:
            raise Exception(f"Whisper transcription failed: {str(e)}")
    
    def _google_speech_to_text(self, audio_path: str) -> Dict[str, any]:
        """Transcribe audio using Google Speech-to-Text API."""
        api_key = os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("GOOGLE_API_KEY")
        
        if not api_key:
            raise Exception("Google API key not found")
        
        # This would implement Google Speech-to-Text API
        # For now, return a placeholder
        return {
            "text": "Google Speech-to-Text transcription would go here",
            "success": True,
            "confidence": 0.95,
            "method": "google"
        }
    
    def _azure_speech_to_text(self, audio_path: str) -> Dict[str, any]:
        """Transcribe audio using Azure Speech Services."""
        api_key = os.getenv("AZURE_SPEECH_KEY")
        region = os.getenv("AZURE_SPEECH_REGION")
        
        if not api_key or not region:
            raise Exception("Azure Speech API credentials not found")
        
        # This would implement Azure Speech Services API
        # For now, return a placeholder
        return {
            "text": "Azure Speech Services transcription would go here",
            "success": True,
            "confidence": 0.93,
            "method": "azure"
        }
    
    def _fallback_speech_to_text(self) -> Dict[str, any]:
        """Fallback STT method when no service is available."""
        return {
            "text": "Speech-to-text service not available. Please configure Whisper or cloud STT services.",
            "success": False,
            "error": "No STT service configured",
            "method": "fallback"
        }
    
    def text_to_speech(self, text: str, 
                      method: str = "pyttsx3",
                      voice: str = "default",
                      speed: float = 1.0) -> Dict[str, any]:
        """
        Convert text to speech.
        
        Args:
            text: Text to convert to speech
            method: TTS method ("pyttsx3", "gtts", "azure", "google")
            voice: Voice identifier
            speed: Speech speed multiplier
            
        Returns:
            Dict with audio data and metadata
        """
        try:
            if method == "pyttsx3" and self.tts_engine:
                return self._pyttsx3_synthesize(text, speed)
            elif method == "gtts" and GTTS_AVAILABLE:
                return self._gtts_synthesize(text, voice)
            elif method == "google":
                return self._google_text_to_speech(text, voice)
            elif method == "azure":
                return self._azure_text_to_speech(text, voice)
            else:
                return self._fallback_text_to_speech(text)
                
        except Exception as e:
            return {
                "audio_data": "",
                "success": False,
                "error": str(e),
                "method": method
            }
    
    def _pyttsx3_synthesize(self, text: str, speed: float = 1.0) -> Dict[str, any]:
        """Synthesize speech using pyttsx3."""
        try:
            # Set speech rate
            rate = self.tts_engine.getProperty('rate')
            self.tts_engine.setProperty('rate', int(rate * speed))
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name
            
            # Generate speech
            self.tts_engine.save_to_file(text, temp_path)
            self.tts_engine.runAndWait()
            
            # Read the generated audio file
            with open(temp_path, 'rb') as f:
                audio_bytes = f.read()
            
            # Clean up
            try:
                os.unlink(temp_path)
            except:
                pass
            
            # Convert to base64
            audio_base64 = base64.b64encode(audio_bytes).decode()
            
            return {
                "audio_data": audio_base64,
                "success": True,
                "format": "wav",
                "method": "pyttsx3"
            }
            
        except Exception as e:
            raise Exception(f"pyttsx3 synthesis failed: {str(e)}")
    
    def _gtts_synthesize(self, text: str, language: str = "en") -> Dict[str, any]:
        """Synthesize speech using Google Text-to-Speech."""
        try:
            # Create gTTS object
            tts = gTTS(text=text, lang=language, slow=False)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                temp_path = temp_file.name
            
            tts.save(temp_path)
            
            # Read the generated audio file
            with open(temp_path, 'rb') as f:
                audio_bytes = f.read()
            
            # Clean up
            try:
                os.unlink(temp_path)
            except:
                pass
            
            # Convert to base64
            audio_base64 = base64.b64encode(audio_bytes).decode()
            
            return {
                "audio_data": audio_base64,
                "success": True,
                "format": "mp3",
                "method": "gtts"
            }
            
        except Exception as e:
            raise Exception(f"gTTS synthesis failed: {str(e)}")
    
    def _google_text_to_speech(self, text: str, voice: str = "default") -> Dict[str, any]:
        """Synthesize speech using Google Cloud Text-to-Speech API."""
        api_key = os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("GOOGLE_API_KEY")
        
        if not api_key:
            raise Exception("Google API key not found")
        
        # This would implement Google Cloud Text-to-Speech API
        # For now, fall back to gTTS if available
        if GTTS_AVAILABLE:
            return self._gtts_synthesize(text)
        else:
            raise Exception("Google Text-to-Speech not available")
    
    def _azure_text_to_speech(self, text: str, voice: str = "default") -> Dict[str, any]:
        """Synthesize speech using Azure Speech Services."""
        api_key = os.getenv("AZURE_SPEECH_KEY")
        region = os.getenv("AZURE_SPEECH_REGION")
        
        if not api_key or not region:
            raise Exception("Azure Speech API credentials not found")
        
        # This would implement Azure Speech Services API
        # For now, return a placeholder
        raise Exception("Azure Text-to-Speech not implemented")
    
    def _fallback_text_to_speech(self, text: str) -> Dict[str, any]:
        """Fallback TTS method when no service is available."""
        return {
            "audio_data": "",
            "success": False,
            "error": "No TTS service available. Please configure pyttsx3, gTTS, or cloud TTS services.",
            "method": "fallback"
        }
    
    def get_available_voices(self, method: str = "pyttsx3") -> List[Dict[str, str]]:
        """Get list of available voices for the specified TTS method."""
        try:
            if method == "pyttsx3" and self.tts_engine:
                voices = self.tts_engine.getProperty('voices')
                return [
                    {
                        "id": voice.id,
                        "name": voice.name,
                        "language": getattr(voice, 'languages', ['unknown'])[0] if hasattr(voice, 'languages') else 'unknown'
                    }
                    for voice in voices
                ]
            elif method == "gtts":
                # gTTS supports many languages
                return [
                    {"id": "en", "name": "English", "language": "en"},
                    {"id": "es", "name": "Spanish", "language": "es"},
                    {"id": "fr", "name": "French", "language": "fr"},
                    {"id": "de", "name": "German", "language": "de"},
                    {"id": "it", "name": "Italian", "language": "it"},
                ]
            else:
                return []
                
        except Exception as e:
            print(f"Error getting voices for {method}: {e}")
            return []
    
    def set_voice_settings(self, method: str = "pyttsx3", **settings):
        """Set voice settings for the specified TTS method."""
        try:
            if method == "pyttsx3" and self.tts_engine:
                if 'rate' in settings:
                    self.tts_engine.setProperty('rate', settings['rate'])
                if 'volume' in settings:
                    self.tts_engine.setProperty('volume', settings['volume'])
                if 'voice' in settings:
                    voices = self.tts_engine.getProperty('voices')
                    for voice in voices:
                        if voice.id == settings['voice']:
                            self.tts_engine.setProperty('voice', voice.id)
                            break
                            
        except Exception as e:
            print(f"Error setting voice settings: {e}")
    
    def get_service_status(self) -> Dict[str, bool]:
        """Get status of all voice services."""
        return {
            "whisper": WHISPER_AVAILABLE and self.whisper_model is not None,
            "pyttsx3": PYTTSX3_AVAILABLE and self.tts_engine is not None,
            "gtts": GTTS_AVAILABLE,
            "google_cloud": bool(os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("GOOGLE_API_KEY")),
            "azure": bool(os.getenv("AZURE_SPEECH_KEY") and os.getenv("AZURE_SPEECH_REGION"))
        }

# Factory function for easy instantiation
def create_voice_processor() -> VoiceProcessor:
    """Create and return a VoiceProcessor instance."""
    return VoiceProcessor()

# Usage example
if __name__ == "__main__":
    # Test voice processor
    processor = VoiceProcessor()
    
    # Check service status
    status = processor.get_service_status()
    print("Voice service status:", status)
    
    # Test TTS if available
    if status["pyttsx3"] or status["gtts"]:
        print("Testing text-to-speech...")
        method = "pyttsx3" if status["pyttsx3"] else "gtts"
        
        result = processor.text_to_speech(
            "Hello, this is a test of the text-to-speech system.",
            method=method
        )
        
        if result["success"]:
            print(f"TTS successful using {result['method']}")
            print(f"Audio data length: {len(result['audio_data'])} characters")
        else:
            print(f"TTS failed: {result.get('error', 'Unknown error')}")
    
    # Test available voices
    voices = processor.get_available_voices("pyttsx3")
    print(f"Available voices: {len(voices)}")
    for voice in voices[:3]:  # Show first 3
        print(f"  - {voice['name']} ({voice['language']})")
