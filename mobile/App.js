import { useState } from 'react';
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

const API_BASE_URL = 'http://10.12.123.178:3000';

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  
  // Theme state: defaults to dark given the "purple black theme" request
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
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick a document');
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile) {
      Alert.alert('Warning', 'Please select a document first.');
      return;
    }
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('document', {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || 'application/pdf',
        name: selectedFile.name || 'document.pdf',
      });

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', `Uploaded! Indexed ${data.chunksProcessed} context chunks.`);
        setAnswer(null);
        setSources([]);
      } else {
        Alert.alert('Upload Error', `${data.error}: ${data.details || 'Upload failed'}`);
      }
    } catch (error) {
      Alert.alert('Network Error', 'Ensure backend is running. Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) {
      Alert.alert('Warning', 'Please formulate a question first.');
      return;
    }
    setAsking(true);
    setAnswer(null);
    setSources([]);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setAnswer(data.answer);
        setSources(data.sources || []);
      } else {
        const errorDetail = typeof data.details === 'string' ? data.details : (data.details?.message || data.details || '');
        Alert.alert('Assistant Error', `${data.error}: ${errorDetail}` || 'Failed to generate an answer.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Failed to reach backend. Error: ' + error.message);
    } finally {
      setAsking(false);
    }
  };

  const styles = getStyles(theme);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.title}>DocuSense<Text style={styles.titleHighlight}>AI</Text></Text>
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
        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Upload Knowledge</Text>
          <TouchableOpacity style={styles.outlineButton} onPress={pickDocument}>
            <Text style={styles.outlineButtonText} numberOfLines={1}>
              {selectedFile ? selectedFile.name : 'Select a PDF Document'}
            </Text>
          </TouchableOpacity>
          <View style={{ marginTop: 12 }}>
            {uploading ? (
               <ActivityIndicator size="small" color={theme.primary} />
            ) : (
               <TouchableOpacity 
                 style={[styles.primaryButton, !selectedFile && styles.buttonDisabled]} 
                 disabled={!selectedFile} 
                 onPress={uploadDocument}
               >
                 <Text style={[styles.primaryButtonText, !selectedFile && styles.buttonDisabledText]}>
                   Process Document
                 </Text>
               </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Q&A Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Query Document</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., What are the main findings?"
            placeholderTextColor={theme.textMuted}
            value={question}
            onChangeText={setQuestion}
          />
          <View style={{ marginTop: 12 }}>
            {asking ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <TouchableOpacity 
                style={[styles.primaryButton, !question.trim() && styles.buttonDisabled]} 
                disabled={!question.trim()} 
                onPress={askQuestion}
              >
                <Text style={[styles.primaryButtonText, !question.trim() && styles.buttonDisabledText]}>
                  Generate Insight
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Answer Display */}
        {answer && (
          <View style={styles.answerSection}>
            <Text style={styles.answerSectionTitle}>AI Analysis</Text>
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
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: theme.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.textMain,
    letterSpacing: 0.5,
  },
  titleHighlight: {
    color: theme.primary,
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
    padding: 20,
  },
  section: {
    backgroundColor: theme.surface,
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.textMain,
    letterSpacing: 0.3,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: theme.primary,
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.border,
  },
  primaryButtonText: {
    color: theme.primaryText,
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabledText: {
    color: theme.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: theme.headerBg,
    color: theme.textMain,
  },
  answerSection: {
    backgroundColor: theme.surfaceHighlight,
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
    borderColor: theme.accentBorder,
    borderWidth: 1.5,
  },
  answerSectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
    color: theme.primary,
  },
  answerText: {
    fontSize: 16,
    color: theme.textMain,
    lineHeight: 26,
    marginBottom: 20,
  },
  sourcesContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 15,
  },
  sourcesTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.textMuted,
  },
  sourceCard: {
    backgroundColor: theme.surface,
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  sourceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceText: {
    fontSize: 14,
    color: theme.textMuted,
    lineHeight: 22,
  },
});
