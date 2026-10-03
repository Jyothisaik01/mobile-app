import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Sparkles, Check } from 'lucide-react-native';
import aiWriteService from '../services/aiWriteService';
import Toast from 'react-native-toast-message';

export default function AiWriteButton({
  task = 'refine_text',
  input = '',
  context = {},
  options = {},
  onGenerated,
  label = 'AI Write',
  style,
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    if (loading) return;

    setLoading(true);
    setSuccess(false);

    try {
      const res = await aiWriteService.generateAiWrite({
        task,
        input: typeof input === 'string' ? input : '',
        context,
        options,
      });

      if (onGenerated) {
        onGenerated(res);
      }

      setSuccess(true);
      const providerTag =
        res.provider === 'ollama'
          ? '🦙 Ollama Local'
          : res.provider === 'groq'
          ? '⚡ Groq AI'
          : '✨ Gemini AI';

      Toast.show({
        type: 'success',
        text1: 'Draft Generated! ✨',
        text2: `Generated using ${providerTag}`,
        position: 'bottom',
      });

      setTimeout(() => {
        setSuccess(false);
      }, 1600);
    } catch (err) {
      console.warn('AI Write failed:', err);
      Toast.show({
        type: 'error',
        text1: 'AI Write Failed',
        text2: err?.response?.data?.msg || err?.message || 'Could not generate AI draft',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const isRewrite = Boolean(input && input.trim().length > 3);
  const displayLabel = label !== 'AI Write' ? label : isRewrite ? 'AI Rewrite' : 'AI Write';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        success && styles.buttonSuccess,
        style,
      ]}
      onPress={handleGenerate}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color="#ffffff" style={styles.icon} />
          <Text style={styles.textLoading}>Generating...</Text>
        </>
      ) : success ? (
        <>
          <Check size={14} color="#10b981" style={styles.icon} />
          <Text style={styles.textSuccess}>Draft Ready!</Text>
        </>
      ) : (
        <>
          <Sparkles size={14} color="#38bdf8" style={styles.icon} />
          <Text style={styles.text}>{displayLabel}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  buttonSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  icon: {
    marginRight: 1,
  },
  text: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textLoading: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  textSuccess: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
});

