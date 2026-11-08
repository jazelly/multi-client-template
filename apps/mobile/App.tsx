import { type Me, type Note, can } from '@app/shared';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SignedOut, api, loadTokens, signIn, signOut } from './src/auth';

// On the web, the sign-in popup lands back on this app at /auth/callback; this hands the result to the opener.
WebBrowser.maybeCompleteAuthSession();

const LIGHT = { bg: '#f4f4f2', card: '#ffffff', text: '#17181a', muted: '#5f6368', line: '#d7d8d4', primary: '#2457d6', onPrimary: '#ffffff', bad: '#b3261e' };
const DARK = { bg: '#121314', card: '#1c1d1f', text: '#ececea', muted: '#a2a5a9', line: '#34363a', primary: '#7ea2ff', onPrimary: '#0b1a3d', bad: '#ff8a80' };

export default function App() {
  const c = useColorScheme() === 'dark' ? DARK : LIGHT;
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [m, n] = await Promise.all([api<Me>('/api/me'), api<Note[]>('/api/notes')]);
      setMe(m);
      setNotes(n);
    } catch (e) {
      if (e instanceof SignedOut) setMe(null);
      else setError((e as Error).message);
    }
  }
  useEffect(() => void loadTokens().then(load), []);

  const run = (p: Promise<unknown>) => p.then(load, (e: Error) => setError(e.message));

  const s = styles(c);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen}>
        <StatusBar style="auto" />
        {me === null && (
          <View style={s.center}>
            <Text style={s.title}>Welcome</Text>
            <Pressable style={s.button} onPress={() => run(signIn())}>
              <Text style={s.buttonText}>Sign in</Text>
            </Pressable>
          </View>
        )}
        {me && (
          <View style={s.body}>
            <View style={s.row}>
              <Text style={[s.title, { flex: 1 }]}>{me.org.name}</Text>
              <Pressable onPress={() => run(signOut())} accessibilityRole="button">
                <Text style={s.link}>Sign out</Text>
              </Pressable>
            </View>
            <Text style={s.muted}>
              {me.user.name} · {me.role.name}
            </Text>
            {can(me.role, 'notes.write') && (
              <View style={s.row}>
                <TextInput style={s.input} value={text} onChangeText={setText} placeholder="New note" placeholderTextColor={c.muted} accessibilityLabel="New note" />
                <Pressable style={s.button} disabled={!text.trim()} onPress={() => run(api('/api/notes', { body: { text } }).then(() => setText('')))}>
                  <Text style={s.buttonText}>Add</Text>
                </Pressable>
              </View>
            )}
            {!!error && <Text style={s.error}>{error}</Text>}
            <FlatList
              style={s.list}
              data={notes}
              keyExtractor={(n) => n.id}
              ItemSeparatorComponent={() => <View style={s.separator} />}
              ListEmptyComponent={<Text style={[s.muted, s.item]}>No notes yet</Text>}
              renderItem={({ item }) => (
                <View style={s.item}>
                  <Text style={s.text}>{item.text}</Text>
                  <Text style={s.muted}>{item.authorName}</Text>
                </View>
              )}
            />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = (c: typeof LIGHT) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, padding: 16 },
    body: { flex: 1, gap: 12, padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 22, fontWeight: '700', color: c.text },
    text: { fontSize: 15, color: c.text },
    muted: { fontSize: 13, color: c.muted },
    link: { fontSize: 15, fontWeight: '600', color: c.primary },
    error: { fontSize: 14, fontWeight: '600', color: c.bad },
    input: { flex: 1, height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.card, color: c.text, fontSize: 16 },
    button: { height: 44, paddingHorizontal: 18, borderRadius: 10, backgroundColor: c.primary, justifyContent: 'center' },
    buttonText: { fontSize: 15, fontWeight: '600', color: c.onPrimary },
    list: { borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card, flexGrow: 0 },
    item: { gap: 2, paddingHorizontal: 16, paddingVertical: 12 },
    separator: { height: 1, backgroundColor: c.line },
  });
