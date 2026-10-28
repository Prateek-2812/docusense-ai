import { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const API_BASE_URL = Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.1.2:3000';

const QUICK_PROMPTS = [
  '💡 Key Insights & Summary',
  '📊 Main Findings',
  '⚡ Action Items & Risks',
  '🔍 Key Takeaways'
];

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [indexedChunks, setIndexedChunks] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('info'); // 'info' | 'success' | 'error'
  
  // Theme state: defaults to dark given the purple black theme
  const [isDark, setIsDark] = useState(true);

  // Theme configuration
  const theme = {
    background: isDark ? '#100b1a' : '#f9f8fa',
    headerBg: isDark ? '#171026' : '#ffffff',
    surface: isDark ? '#1f1533' : '#ffffff',
    surfaceHighlight: isDark ? '#2a1d45' : '#f3e8ff',
    primary: isDark ? '#a78bfa' : '#6d28d9', // Bright violet
    primaryText: isDark ? '#100b1a' : '#ffffff',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#3b2f5c' : '#e2e8f0',
    accentBorder: isDark ? '#8b5cf6' : '#7c3aed',
    chipBg: isDark ? '#291c44' : '#ede9fe',
    chipBorder: isDark ? '#4c337a' : '#ddd6fe',
    chipText: isDark ? '#c4b5fd' : '#5b21b6',
    successBg: isDark ? '#064e3b' : '#d1fae5',
    successText: isDark ? '#a7f3d0' : '#065f46',
    errorBg: isDark ? '#7f1d1d' : '#fee2e2',
    errorText: isDark ? '#fecaca' : '#991b1b',
  };

  // Check initial backend status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/status`);
        if (res.ok) {
          const data = await res.json();
          setIndexedChunks(data.indexedChunks || 0);
        }
      } catch (e) {
        // Backend not yet reachable
      }
    };
    checkStatus();
  }, []);

  const showNotification = (msg, type = 'info') => {
    setStatusMessage(msg);
    setStatusType(type);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/*'],
        copyToCacheDirectory: true
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        showNotification(`Selected: ${result.assets[0].name}`, 'info');
      }
    } catch (error) {
      showNotification('Failed to pick a document: ' + error.message, 'error');
      if (Platform.OS !== 'web') Alert.alert('Error', 'Failed to pick a document');
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile) {
      showNotification('Please select a PDF document first.', 'error');
      if (Platform.OS !== 'web') Alert.alert('Warning', 'Please select a document first.');
      return;
    }
    setUploading(true);
    showNotification('Processing and indexing document...', 'info');
    
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        if (selectedFile.file) {
          formData.append('document', selectedFile.file, selectedFile.name || 'document.pdf');
        } else if (selectedFile.uri) {
          const res = await fetch(selectedFile.uri);
          const blob = await res.blob();
          formData.append('document', blob, selectedFile.name || 'document.pdf');
        } else {
          throw new Error('Could not access selected file data.');
        }
      } else {
        formData.append('document', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType || 'application/pdf',
          name: selectedFile.name || 'document.pdf',
        });
      }

      // Note: Do NOT set Content-Type header; fetch sets it automatically with the boundary
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        const count = data.chunksProcessed || 0;
        setIndexedChunks(count);
        showNotification(`✅ Document indexed successfully! (${count} context chunks ready)`, 'success');
        if (Platform.OS !== 'web') {
          Alert.alert('Success', `Uploaded! Indexed ${count} context chunks.`);
        }
        setAnswer(null);
        setSources([]);
      } else {
        const err = `${data.error || 'Upload failed'}${data.details ? ': ' + data.details : ''}`;
        showNotification(`❌ ${err}`, 'error');
        if (Platform.OS !== 'web') Alert.alert('Upload Error', err);
      }
    } catch (error) {
      showNotification(`❌ Network Error: ${error.message}. Is backend running on ${API_BASE_URL}?`, 'error');
      if (Platform.OS !== 'web') {
        Alert.alert('Network Error', 'Ensure backend is running. Error: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const askQuestion = async (customQuestion) => {
    const queryToUse = (typeof customQuestion === 'string' ? customQuestion : question).trim() || 
      'Provide a comprehensive summary and key insights of this document.';
    
    if (typeof customQuestion === 'string') {
      setQuestion(customQuestion);
    }

    if (indexedChunks === 0) {
      showNotification('⚠️ Please upload and process a PDF document first so insights can be generated.', 'error');
      if (Platform.OS !== 'web') {
        Alert.alert('Document Required', 'Please upload and process a PDF document first.');
      }
      return;
    }

    setAsking(true);
    setAnswer(null);
    setSources([]);
    showNotification('Analyzing document and generating insights with Gemini AI...', 'info');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryToUse }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setAnswer(data.answer);
        setSources(data.sources || []);
        showNotification('✨ Insights generated successfully!', 'success');
      } else {
        const errorDetail = typeof data.details === 'string' ? data.details : (data.details?.message || data.details || '');
        const msg = `${data.error || 'Failed to generate insight'}${errorDetail ? ': ' + errorDetail : ''}`;
        showNotification(`❌ ${msg}`, 'error');
        if (Platform.OS !== 'web') Alert.alert('Assistant Error', msg);
      }
    } catch (error) {
      showNotification(`❌ Connection error: ${error.message}`, 'error');
      if (Platform.OS !== 'web') {
        Alert.alert('Network Error', 'Failed to reach backend. Error: ' + error.message);
      }
    } finally {
      setAsking(false);
    }
  };

  const styles = getStyles(theme);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>DocuSense<Text style={styles.titleHighlight}>AI</Text></Text>
          <Text style={styles.subtitle}>Grounded Document Intelligence</Text>
        </View>
        <View style={styles.themeToggle}>
          <Text style={styles.themeToggleText}>{isDark ? '🌙' : '☀️'}</Text>
          <Switch 
            value={isDark} 
            onValueChange={setIsDark}
            trackColor={{ false: '#cbd5e1', true: '#4c1d95' }}
            thumbColor={isDark ? '#a78bfa' : '#ffffff'}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollArea}>
        {/* Live Status Banner */}
        {statusMessage && (
          <View style={[
            styles.banner, 
            statusType === 'success' && styles.bannerSuccess,
            statusType === 'error' && styles.bannerError
          ]}>
            <Text style={[
              styles.bannerText,
              statusType === 'success' && styles.bannerTextSuccess,
              statusType === 'error' && styles.bannerTextError
            ]}>
              {statusMessage}
            </Text>
          </View>
        )}

        {/* Upload Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. Upload Document</Text>
            <View style={[styles.badge, indexedChunks > 0 ? styles.badgeSuccess : styles.badgeMuted]}>
              <Text style={[styles.badgeText, indexedChunks > 0 ? styles.badgeTextSuccess : styles.badgeTextMuted]}>
                {indexedChunks > 0 ? `🟢 ${indexedChunks} Chunks Ready` : '⚪ No PDF Indexed'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.outlineButton} onPress={pickDocument}>
            <Text style={styles.outlineButtonText} numberOfLines={1}>
              {selectedFile ? `📄 ${selectedFile.name}` : 'Select a PDF Document'}
            </Text>
          </TouchableOpacity>
          <View style={{ marginTop: 12 }}>
            {uploading ? (
               <View style={styles.loadingRow}>
                 <ActivityIndicator size="small" color={theme.primary} />
                 <Text style={styles.loadingText}>Processing & Indexing PDF...</Text>
               </View>
            ) : (
               <TouchableOpacity 
                 style={[styles.primaryButton, !selectedFile && styles.buttonDisabled]} 
                 disabled={!selectedFile} 
                 onPress={uploadDocument}
               >
                 <Text style={[styles.primaryButtonText, !selectedFile && styles.buttonDisabledText]}>
                   Process & Index Document
                 </Text>
               </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Q&A / Insight Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Query & Generate Insights</Text>
          
          {/* Quick Preset Prompts */}
          <Text style={styles.presetLabel}>Quick Presets:</Text>
          <View style={styles.chipContainer}>
            {QUICK_PROMPTS.map((promptText, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.chip}
                onPress={() => askQuestion(promptText)}
                disabled={asking}
              >
                <Text style={styles.chipText}>{promptText}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Ask a question or leave empty for general summary..."
            placeholderTextColor={theme.textMuted}
            value={question}
            onChangeText={setQuestion}
          />
          <View style={{ marginTop: 12 }}>
            {asking ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={styles.loadingText}>Synthesizing insight...</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => askQuestion()}
              >
                <Text style={styles.primaryButtonText}>
                  ✨ Generate Insight
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Answer Display */}
        {answer && (
          <View style={styles.answerSection}>
            <View style={styles.answerHeaderRow}>
              <Text style={styles.answerSectionTitle}>AI Analysis & Insights</Text>
              <Text style={styles.groundedTag}>Gemini Grounded</Text>
            </View>
            <Text style={styles.answerText}>{answer}</Text>
            
            {sources.length > 0 && (
              <View style={styles.sourcesContainer}>
                <Text style={styles.sourcesTitle}>Grounded Sources (Top {sources.length}):</Text>
                {sources.map((src, index) => (
                  <View key={index} style={styles.sourceCard}>
                    <Text style={styles.sourceLabel}>Chunk {index + 1}</Text>
                    <Text style={styles.sourceText}>
                      {src}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.textMain,
    letterSpacing: 0.5,
  },
  titleHighlight: {
    color: theme.primary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleText: {
    marginRight: 6,
    fontSize: 16,
  },
  scrollArea: {
    flex: 1,
    padding: 16,
  },
  banner: {
    backgroundColor: theme.surfaceHighlight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bannerSuccess: {
    backgroundColor: theme.successBg,
    borderColor: '#059669',
  },
  bannerError: {
    backgroundColor: theme.errorBg,
    borderColor: '#dc2626',
  },
  bannerText: {
    fontSize: 14,
    color: theme.textMain,
    fontWeight: '600',
  },
  bannerTextSuccess: {
    color: theme.successText,
  },
  bannerTextError: {
    color: theme.errorText,
  },
  section: {
    backgroundColor: theme.surface,
    padding: 18,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textMain,
    letterSpacing: 0.3,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccess: {
    backgroundColor: theme.successBg,
  },
  badgeMuted: {
    backgroundColor: theme.surfaceHighlight,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: theme.successText,
  },
  badgeTextMuted: {
    color: theme.textMuted,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: theme.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: theme.surfaceHighlight,
    borderStyle: 'dashed',
  },
  outlineButtonText: {
    color: theme.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.border,
    opacity: 0.6,
  },
  primaryButtonText: {
    color: theme.primaryText,
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabledText: {
    color: theme.textMuted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    color: theme.textMuted,
    fontSize: 14,
    marginLeft: 8,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textMuted,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: theme.chipBg,
    borderColor: theme.chipBorder,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.chipText,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: theme.headerBg,
    color: theme.textMain,
  },
  answerSection: {
    backgroundColor: theme.surfaceHighlight,
    padding: 20,
    borderRadius: 14,
    marginBottom: 40,
    borderColor: theme.accentBorder,
    borderWidth: 1.5,
  },
  answerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.primary,
  },
  groundedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.primary,
    backgroundColor: theme.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  answerText: {
    fontSize: 15,
    color: theme.textMain,
    lineHeight: 25,
    marginBottom: 20,
  },
  sourcesContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 15,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.textMuted,
  },
  sourceCard: {
    backgroundColor: theme.surface,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceText: {
    fontSize: 13,
    color: theme.textMuted,
    lineHeight: 20,
  },
});
