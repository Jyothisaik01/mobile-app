import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  Easing,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useMicrophonePermissions } from 'expo-camera';
import {
  Mic,
  X,
  Search,
  Sparkles,
  ArrowRight,
  Volume2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import colors from '../theme/colors';
import apiClient from '../services/api';

const { width } = Dimensions.get('window');

const SAMPLE_VOICE_QUERIES = [
  'Noise-cancelling wireless headphones',
  'Running shoes with soft cushioning',
  'Apple iPhone & MacBooks',
  'Smartwatches with heart rate monitor',
  'Casual oversized cotton hoodies',
  'Ergonomic gaming chairs',
];

const HTML_VOICE_BRIDGE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Voice Bridge</title>
</head>
<body style="background:transparent; margin:0; padding:0;">
<script>
  let mediaRecorder = null;
  let audioChunks = [];
  let speechRec = null;
  let audioCtx = null;
  let analyser = null;
  let animId = null;

  function sendToRN(payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  window.startVoiceRecording = async function() {
    audioChunks = [];

    // 1. Try Speech Recognition for instant on-device text
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        if (speechRec) {
          try { speechRec.abort(); } catch(e) {}
        }
        speechRec = new SpeechRecognition();
        speechRec.continuous = true;
        speechRec.interimResults = true;
        speechRec.lang = 'en-US';

        speechRec.onresult = function(event) {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          if (text) {
            sendToRN({ type: 'INTERIM_SPEECH', text: text });
          }
        };

        speechRec.onerror = function(err) {
          console.warn('SpeechRec error:', err);
        };

        speechRec.start();
      }
    } catch(e) {
      console.warn('SpeechRec init err:', e);
    }

    // 2. Capture audio stream with getUserMedia or legacy media
    try {
      var getAudioStream = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        getAudioStream = function(c) { return navigator.mediaDevices.getUserMedia(c); };
      } else if (navigator.getUserMedia) {
        getAudioStream = function(c) {
          return new Promise(function(resolve, reject) {
            navigator.getUserMedia(c, resolve, reject);
          });
        };
      } else if (navigator.webkitGetUserMedia) {
        getAudioStream = function(c) {
          return new Promise(function(resolve, reject) {
            navigator.webkitGetUserMedia(c, resolve, reject);
          });
        };
      }

      if (!getAudioStream) {
        sendToRN({ type: 'MIC_UNAVAILABLE', message: 'Audio recording not supported in this environment' });
        return;
      }

      const stream = await getAudioStream({ audio: true });

      // Audio volume metering
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function checkVolume() {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          sendToRN({ type: 'VOLUME', volume: Math.min(1.0, Math.max(0.15, avg / 55)) });
          animId = requestAnimationFrame(checkVolume);
        }
        checkVolume();
      } catch(e) {
        console.warn('Audio analyser err:', e);
      }

      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        }
      }

      mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

      mediaRecorder.ondataavailable = function(e) {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = function() {
        if (animId) cancelAnimationFrame(animId);
        if (audioCtx) {
          try { audioCtx.close(); } catch(e) {}
        }
        try {
          stream.getTracks().forEach(track => track.stop());
        } catch(e) {}

        if (audioChunks.length === 0) {
          sendToRN({ type: 'EMPTY_AUDIO' });
          return;
        }

        const blob = new Blob(audioChunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = function() {
          sendToRN({
            type: 'AUDIO_DATA',
            base64: reader.result,
            mimeType: mimeType
          });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(250);
      sendToRN({ type: 'STARTED' });
    } catch(err) {
      sendToRN({ type: 'MIC_UNAVAILABLE', message: err.message || 'Microphone access denied' });
    }
  };

  window.stopVoiceRecording = function() {
    if (speechRec) {
      try { speechRec.stop(); } catch(e) {}
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        if (typeof mediaRecorder.requestData === 'function') {
          mediaRecorder.requestData();
        }
        mediaRecorder.stop();
      } catch(e) {
        sendToRN({ type: 'STOP_NO_AUDIO' });
      }
    } else {
      sendToRN({ type: 'STOP_NO_AUDIO' });
    }
  };
</script>
</body>
</html>
`;

export default function VoiceSearchModal({
  visible,
  onClose,
  onSearchQuery,
}) {
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Listening... Speak now 🎙️');

  const webViewRef = useRef(null);
  const autoStopTimerRef = useRef(null);
  const transcribingTimeoutRef = useRef(null);

  // Animation values for audio wave & radar pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wave1 = useRef(new Animated.Value(0.4)).current;
  const wave2 = useRef(new Animated.Value(0.7)).current;
  const wave3 = useRef(new Animated.Value(0.3)).current;
  const wave4 = useRef(new Animated.Value(0.9)).current;
  const wave5 = useRef(new Animated.Value(0.5)).current;

  // Pulse effect loop
  useEffect(() => {
    let loop;
    if (visible && isListening) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();

      // Waves animation
      const animateWave = (anim, duration) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration,
              useNativeDriver: true,
            }),
          ])
        );

      const l1 = animateWave(wave1, 500);
      const l2 = animateWave(wave2, 650);
      const l3 = animateWave(wave3, 400);
      const l4 = animateWave(wave4, 550);
      const l5 = animateWave(wave5, 700);

      l1.start();
      l2.start();
      l3.start();
      l4.start();
      l5.start();

      return () => {
        loop.stop();
        l1.stop();
        l2.stop();
        l3.stop();
        l4.stop();
        l5.stop();
      };
    }
  }, [visible, isListening]);

  // Handle open / close lifecycle
  useEffect(() => {
    let isMounted = true;
    async function initVoice() {
      if (visible) {
        setTranscript('');
        setIsTranscribing(false);
        setIsListening(true);
        setStatusMessage('Listening... Speak now 🎙️');

        // Request native OS microphone permission if not yet granted
        try {
          if (!micPermission?.granted) {
            await requestMicPermission();
          }
        } catch (e) {
          console.log('[Voice] Perm check:', e?.message);
        }

        // Slight delay to ensure WebView is ready
        const t = setTimeout(() => {
          if (isMounted) triggerStartInWebView();
        }, 500);

        // Auto-stop after 8 seconds of listening
        autoStopTimerRef.current = setTimeout(() => {
          if (isMounted) handleStopAndTranscribe();
        }, 8000);

        return () => {
          clearTimeout(t);
        };
      } else {
        stopRecordingImmediately();
      }
    }

    initVoice();

    return () => {
      isMounted = false;
      stopRecordingImmediately();
    };
  }, [visible]);

  const triggerStartInWebView = () => {
    webViewRef.current?.injectJavaScript(`
      if (window.startVoiceRecording) {
        window.startVoiceRecording();
      }
      true;
    `);
  };

  const triggerStopInWebView = () => {
    webViewRef.current?.injectJavaScript(`
      if (window.stopVoiceRecording) {
        window.stopVoiceRecording();
      }
      true;
    `);
  };

  const stopRecordingImmediately = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (transcribingTimeoutRef.current) {
      clearTimeout(transcribingTimeoutRef.current);
      transcribingTimeoutRef.current = null;
    }
    triggerStopInWebView();
    setIsListening(false);
    setIsTranscribing(false);
  };

  const startListening = () => {
    setIsListening(true);
    setIsTranscribing(false);
    setStatusMessage('Listening... Speak now 🎙️');
    triggerStartInWebView();

    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = setTimeout(() => {
      handleStopAndTranscribe();
    }, 8000);
  };

  const handleStopAndTranscribe = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    setIsListening(false);
    triggerStopInWebView();

    // If transcript was already filled by live Web Speech, submit immediately
    if (transcript && transcript.trim().length > 0) {
      setStatusMessage('Voice query recognized! Searching catalog...');
      setTimeout(() => {
        handleSubmit(transcript);
      }, 600);
      return;
    }

    // Set transcribing state with a strict safety timeout so it never hangs
    setIsTranscribing(true);
    setStatusMessage('Transcribing voice with Whisper AI... ⚡');

    if (transcribingTimeoutRef.current) clearTimeout(transcribingTimeoutRef.current);
    transcribingTimeoutRef.current = setTimeout(() => {
      setIsTranscribing((cur) => {
        if (cur) {
          setStatusMessage('Could not recognize voice. Tap mic to retry or choose a prompt.');
          return false;
        }
        return false;
      });
    }, 6000);
  };

  const handleToggleListening = () => {
    if (isTranscribing) return;

    if (isListening) {
      handleStopAndTranscribe();
    } else {
      startListening();
    }
  };

  // WebView message dispatcher
  const handleWebViewMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'VOLUME' && data.volume !== undefined) {
        const v = data.volume;
        wave1.setValue(v * 0.9);
        wave2.setValue(v * 1.2);
        wave3.setValue(v * 0.7);
        wave4.setValue(v * 1.0);
        wave5.setValue(v * 0.8);
      } else if ((data.type === 'INTERIM_SPEECH' || data.type === 'FINAL_SPEECH') && data.text) {
        const spoken = data.text.trim();
        setTranscript(spoken);
        setStatusMessage(`Recognized: "${spoken}"`);
      } else if (data.type === 'AUDIO_DATA' && data.base64) {
        // Send audio to backend Groq Whisper / Gemini AI
        setIsTranscribing(true);
        setStatusMessage('Transcribing audio with Whisper AI... ⚡');

        try {
          const res = await apiClient.post('/voice/transcribe', {
            audio: data.base64,
            mimeType: data.mimeType || 'audio/webm',
          });

          if (res.data && res.data.success && res.data.transcript) {
            const cleanText = res.data.transcript.trim();
            setTranscript(cleanText);
            setStatusMessage('Voice recognized! Searching catalog...');

            setTimeout(() => {
              handleSubmit(cleanText);
            }, 800);
          } else {
            setStatusMessage('Could not recognize voice. Tap mic to retry or select a prompt.');
          }
        } catch (err) {
          console.log('[Voice] Transcribe err:', err?.message);
          if (transcript.trim().length > 0) {
            handleSubmit(transcript);
          } else {
            setStatusMessage('Could not reach Whisper AI. Tap mic to retry or type query.');
          }
        } finally {
          if (transcribingTimeoutRef.current) clearTimeout(transcribingTimeoutRef.current);
          setIsTranscribing(false);
        }
      } else if (data.type === 'EMPTY_AUDIO' || data.type === 'STOP_NO_AUDIO') {
        if (transcribingTimeoutRef.current) clearTimeout(transcribingTimeoutRef.current);
        setIsTranscribing(false);
        setIsListening(false);
        if (!transcript.trim()) {
          setStatusMessage('No voice detected. Tap mic to speak or select a prompt below.');
        }
      } else if (data.type === 'ERROR' || data.type === 'MIC_UNAVAILABLE') {
        if (transcribingTimeoutRef.current) clearTimeout(transcribingTimeoutRef.current);
        console.log('[VoiceSearch] Mic note:', data.message);
        setStatusMessage('Select a suggested search below or type your query 🎙️');
        setIsListening(false);
        setIsTranscribing(false);
      }
    } catch (e) {
      console.log('[Voice] Failed to parse message:', e);
    }
  };

  const handleSelectQuery = (query) => {
    stopRecordingImmediately();
    setTranscript(query);
    setStatusMessage(`Selected: "${query}"`);
    setTimeout(() => {
      handleSubmit(query);
    }, 400);
  };

  const handleSubmit = (finalQuery) => {
    stopRecordingImmediately();
    const q = finalQuery || transcript;
    if (q && q.trim().length > 0) {
      onSearchQuery(q.trim());
      onClose();
    }
  };

  const handleCancelAndClose = () => {
    stopRecordingImmediately();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancelAndClose}>
      <View style={styles.overlay}>
        {/* Hidden Audio Bridge WebView */}
        <View style={styles.hiddenBridge}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: HTML_VOICE_BRIDGE, baseUrl: 'https://localhost' }}
            onMessage={handleWebViewMessage}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            mediaCapturePermissionGrantType="grant"
            javaScriptEnabled={true}
            domStorageEnabled={true}
            androidHardwareAccelerationDisabled={false}
            onPermissionRequest={(event) => {
              if (event?.request?.grant) {
                event.request.grant(event.request.resources);
              }
            }}
          />
        </View>

        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.sparkleIcon}>
                <Sparkles size={16} color="#38bdf8" />
              </View>
              <Text style={styles.headerTitle}>Voice Assistant Search</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCancelAndClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Radar / Mic Animation Area */}
          <View style={styles.micArea}>
            {isListening && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.25],
                      outputRange: [0.6, 0.1],
                    }),
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={[
                styles.micButton,
                isListening
                  ? styles.micButtonListening
                  : isTranscribing
                  ? styles.micButtonTranscribing
                  : styles.micButtonPaused,
              ]}
              onPress={handleToggleListening}
              activeOpacity={0.8}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <ActivityIndicator size="large" color="#ffffff" />
              ) : isListening ? (
                <Mic size={36} color="#ffffff" />
              ) : (
                <Mic size={36} color="#38bdf8" />
              )}
            </TouchableOpacity>

            {/* Audio Wave Visualizer Bars */}
            {isListening ? (
              <View style={styles.waveRow}>
                {[wave1, wave2, wave3, wave4, wave5].map((w, idx) => (
                  <Animated.View
                    key={idx}
                    style={[
                      styles.waveBar,
                      {
                        transform: [{ scaleY: w }],
                      },
                    ]}
                  />
                ))}
              </View>
            ) : isTranscribing ? (
              <View style={styles.pausedIndicator}>
                <Text style={[styles.pausedIndicatorText, { color: '#38bdf8' }]}>Transcribing with Whisper AI...</Text>
              </View>
            ) : (
              <View style={styles.pausedIndicator}>
                <Text style={styles.pausedIndicatorText}>Tap mic to speak</Text>
              </View>
            )}

            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>

          {/* Transcript Box */}
          <View style={styles.transcriptWrap}>
            <TextInput
              style={styles.transcriptInput}
              placeholder="Spoken words will appear here (or type)..."
              placeholderTextColor="#64748b"
              value={transcript}
              onChangeText={setTranscript}
              multiline
            />
            {transcript.length > 0 && (
              <TouchableOpacity
                style={styles.searchSubmitBtn}
                onPress={() => handleSubmit(transcript)}
              >
                <Search size={16} color="#ffffff" />
                <Text style={styles.searchSubmitText}>Search Catalog</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sample Prompts */}
          <View style={styles.promptsSection}>
            <View style={styles.promptsTitleRow}>
              <Volume2 size={13} color="#94a3b8" />
              <Text style={styles.promptsTitle}>TRY SPEAKING OR TAP TO SEARCH</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptsScroll}
            >
              {SAMPLE_VOICE_QUERIES.map((query, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.promptChip}
                  onPress={() => handleSelectQuery(query)}
                  activeOpacity={0.7}
                >
                  <Sparkles size={12} color="#38bdf8" style={{ marginRight: 6 }} />
                  <Text style={styles.promptChipText}>{query}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Footer note */}
          <View style={styles.footerNote}>
            <CheckCircle2 size={12} color="#10b981" />
            <Text style={styles.footerNoteText}>
              Powered by Groq Whisper Large V3 & Google Gemini Audio
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  hiddenBridge: {
    position: 'absolute',
    top: -500,
    left: -500,
    width: 150,
    height: 150,
    opacity: 0.01,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0a0f1d',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  micButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  micButtonListening: {
    backgroundColor: '#0284c7',
    borderWidth: 3,
    borderColor: '#38bdf8',
  },
  micButtonTranscribing: {
    backgroundColor: '#7c3aed',
    borderWidth: 3,
    borderColor: '#a855f7',
  },
  micButtonPaused: {
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 28,
    marginTop: 14,
  },
  waveBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#38bdf8',
  },
  pausedIndicator: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  pausedIndicatorText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  statusText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  transcriptWrap: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    marginBottom: 16,
  },
  transcriptInput: {
    color: '#ffffff',
    fontSize: 14,
    minHeight: 44,
    textAlignVertical: 'top',
    padding: 0,
  },
  searchSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  searchSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  promptsSection: {
    marginBottom: 14,
  },
  promptsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  promptsTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  promptsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  promptChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  footerNoteText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
});
