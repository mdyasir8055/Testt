import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsListening(true);
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setIsProcessing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const base64Audio = await blobToBase64(audioBlob);
          
          // Clean up stream
          stream.getTracks().forEach(track => track.stop());
          return base64Audio;
        } catch (error) {
          console.error('Error processing audio:', error);
          return '';
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isListening) {
        let audioResult = '';
        
        const handleStop = async () => {
          try {
            setIsListening(false);
            setIsProcessing(true);
            
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            audioResult = await blobToBase64(audioBlob);
            
            // Clean up stream
            // Clean up stream tracks
          if (mediaRecorderRef.current) {
            const stream = mediaRecorderRef.current.stream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
          }
            
            resolve(audioResult);
          } catch (error) {
            console.error('Error in stopListening:', error);
            resolve('');
          } finally {
            setIsProcessing(false);
          }
        };
        
        mediaRecorderRef.current.onstop = handleStop;
        mediaRecorderRef.current.stop();
      } else {
        resolve('');
      }
    });
  }, [isListening]);

  const playAudio = useCallback(async (text: string, voice?: string) => {
    try {
      const response = await api.chat.textToSpeech(text, voice);
      if (!response?.audioData) {
        console.warn('No audio data received');
        return;
      }
      
      // Convert base64 to blob and play
      const audioBlob = base64ToBlob(response.audioData, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        audio.onloadeddata = () => {
          audio.play().catch(reject);
        };
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }, []);

  return {
    isListening,
    isProcessing,
    startListening,
    stopListening,
    playAudio,
  };
}

// Utility functions
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:audio/wav;base64, prefix
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
