import { NativeModules } from 'react-native';
import apiClient from './api';

let AudioModule = null;
let audioInitAttempted = false;

function getAudioModule() {
  if (audioInitAttempted) return AudioModule;
  audioInitAttempted = true;

  try {
    // Only attempt to require expo-av if ExponentAV native module exists in host binary
    if (NativeModules && NativeModules.ExponentAV) {
      const expoAv = require('expo-av');
      if (expoAv && expoAv.Audio) {
        AudioModule = expoAv.Audio;
      }
    } else {
      AudioModule = null;
    }
  } catch (err) {
    console.warn('Native module ExponentAV is not available in this client:', err?.message);
    AudioModule = null;
  }

  return AudioModule;
}

export const voiceService = {
  /**
   * Check if native audio recording module is linked and available
   */
  isAvailable: () => {
    return Boolean(getAudioModule());
  },

  /**
   * Request microphone permission from user
   */
  requestPermission: async () => {
    const Audio = getAudioModule();
    if (!Audio) return false;
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn('Failed to request mic permission:', err);
      return false;
    }
  },

  /**
   * Start microphone audio recording
   * @param {Function} onStatusUpdate callback for audio metering / duration updates
   */
  startRecording: async (onStatusUpdate) => {
    const Audio = getAudioModule();
    if (!Audio) {
      throw new Error('Native audio recording is not available in Expo Go. Please tap a suggestion below or type your search query.');
    }

    try {
      const hasPerm = await voiceService.requestPermission();
      if (!hasPerm) {
        throw new Error('Microphone permission is required for voice search.');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      if (onStatusUpdate) {
        recording.setOnRecordingStatusUpdate(onStatusUpdate);
        recording.setProgressUpdateInterval(100);
      }

      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      return recording;
    } catch (err) {
      console.warn('Start recording error:', err);
      throw err;
    }
  },

  /**
   * Stop recording and send audio to backend for transcription (Groq Whisper / Gemini AI)
   */
  stopAndTranscribe: async (recording) => {
    if (!recording) {
      throw new Error('No active audio recording');
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Audio file URI not found');
      }

      // Convert audio file to Base64 data URL
      const response = await fetch(uri);
      const blob = await response.blob();

      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Send to backend transcription engine
      const res = await apiClient.post('/voice/transcribe', {
        audio: base64Audio,
        mimeType: 'audio/m4a',
      });

      if (res.data && res.data.success && res.data.transcript) {
        return {
          success: true,
          transcript: res.data.transcript,
          provider: res.data.provider,
        };
      }

      throw new Error(res.data?.msg || 'Could not recognize spoken words.');
    } catch (err) {
      console.warn('Stop & transcribe error:', err);
      throw err;
    }
  },
};

export default voiceService;
