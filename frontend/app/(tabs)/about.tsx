import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';

const C = {
  primary: '#2E7D32', bg: '#F6FBF6', surface: '#FFFFFF', fill: '#EDF7EE',
  secondary: '#E8F5E9', text: '#0A1F10', sub: '#5A7060', border: '#D4EAD6',
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={s.section}>
    <Text style={s.sectionTitle}>{title}</Text>
    {children}
  </View>
);

export default function AboutScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={s.safe}>
      {/* Back Header */}
      <View style={s.backHeader}>
        <TouchableOpacity testID="about-back-btn" style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.backTitle}>About Animitra</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={s.header}>
          <View style={s.logoCircle}>
            <Text style={s.logoEmoji}>🐾</Text>
          </View>
          <Text style={s.appName}>Animitra</Text>
          <Text style={s.tagline}>Veterinary Practice Manager</Text>
          <Text style={s.version}>Version 1.0.0</Text>
        </View>

        <Section title="About Animitra">
          <Text style={s.bodyText}>
            Animitra is a comprehensive veterinary practice management app designed exclusively
            for licensed veterinarians in India. It helps vets manage their daily cases,
            patient records, earnings, and follow-ups — all in one place.
          </Text>
          <Text style={s.bodyText}>
            Built with care for rural and urban veterinarians who work with all types of animals —
            from household pets to livestock and farm animals.
          </Text>
        </Section>

        <Section title="Key Features">
          {[
            ['📋', 'Case Management', 'Track daily walk-ins and scheduled cases'],
            ['📅', 'Follow-up Scheduling', 'Never miss a follow-up with date & reason'],
            ['💳', 'Payment Ledger', 'Track outstanding payments from farmers'],
            ['📊', 'Reports', 'Animal-wise, reason-wise, and earnings reports'],
            ['↗', 'Case Forwarding', 'Forward cases to registered colleague vets'],
            ['📍', 'Village Tracking', 'Track cases by village and area'],
          ].map(([emoji, title, desc]) => (
            <View key={title} style={s.featureRow}>
              <Text style={s.featureEmoji}>{emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{title}</Text>
                <Text style={s.featureDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </Section>

        <Section title="How to Subscribe">
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>₹200 — Lifetime Access</Text>
            <Text style={s.infoDesc}>
              1. Pay ₹200 via UPI to {' '}
              <Text style={s.highlight}>9486544884@kvb</Text>
            </Text>
            <Text style={s.infoDesc}>2. Note your UTR/Transaction reference number</Text>
            <Text style={s.infoDesc}>3. Submit your UTR on the activation screen</Text>
            <Text style={s.infoDesc}>4. Admin will verify and send your coupon code</Text>
            <Text style={s.infoDesc}>5. Enter coupon code to activate your account</Text>
          </View>
        </Section>

        <Section title="Contact & Support">
          <View style={s.contactCard}>
            <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL('tel:+919486544884')}>
              <Text style={s.contactEmoji}>📞</Text>
              <View>
                <Text style={s.contactLabel}>Phone Support</Text>
                <Text style={s.contactValue}>+91 94865 44884</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL('mailto:support@animitra.in')}>
              <Text style={s.contactEmoji}>📧</Text>
              <View>
                <Text style={s.contactLabel}>Email</Text>
                <Text style={s.contactValue}>support@animitra.in</Text>
              </View>
            </TouchableOpacity>
            <View style={s.contactRow}>
              <Text style={s.contactEmoji}>⏰</Text>
              <View>
                <Text style={s.contactLabel}>Support Hours</Text>
                <Text style={s.contactValue}>Mon–Sat, 9 AM – 6 PM</Text>
              </View>
            </View>
          </View>
        </Section>

        <Section title="Terms & Conditions">
          <Text style={s.bodyText}>
            <Text style={s.bold}>1. Eligibility: </Text>
            Animitra is available exclusively for licensed veterinarians registered with a State Veterinary Council in India.
          </Text>
          <Text style={s.bodyText}>
            <Text style={s.bold}>2. Subscription: </Text>
            One-time payment of ₹200 grants lifetime access to the current version of Animitra. Future major upgrades may require additional payment.
          </Text>
          <Text style={s.bodyText}>
            <Text style={s.bold}>3. Data Privacy: </Text>
            Your case data and patient information are stored securely. We do not share your data with third parties without your consent.
          </Text>
          <Text style={s.bodyText}>
            <Text style={s.bold}>4. Data Responsibility: </Text>
            Animitra provides tools for record-keeping. The accuracy of clinical information entered is the sole responsibility of the veterinarian.
          </Text>
          <Text style={s.bodyText}>
            <Text style={s.bold}>5. Misuse: </Text>
            Accounts found to be involved in unauthorized or fraudulent activities will be permanently suspended without refund.
          </Text>
          <Text style={s.bodyText}>
            <Text style={s.bold}>6. Refund Policy: </Text>
            Subscription fees are non-refundable once the account is activated.
          </Text>
          <Text style={s.bodyText}>
            <Text style={s.bold}>7. Amendments: </Text>
            We reserve the right to update these terms. Users will be notified of significant changes.
          </Text>
        </Section>

        <Section title="Usage Guidelines">
          <Text style={s.bodyText}>• Use Animitra only for legitimate veterinary practice management.</Text>
          <Text style={s.bodyText}>• Do not share your login credentials with others.</Text>
          <Text style={s.bodyText}>• Each account is for one veterinarian only.</Text>
          <Text style={s.bodyText}>• Case forwarding is only for registered Animitra vets.</Text>
          <Text style={s.bodyText}>• Report any technical issues to our support team.</Text>
        </Section>

        <View style={s.footer}>
          <Text style={s.footerText}>© 2026 Animitra. All rights reserved.</Text>
          <Text style={s.footerText}>Made with ❤️ for Indian Veterinarians</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  backHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { paddingHorizontal: 4, paddingVertical: 4, minWidth: 60 },
  backBtnText: { fontSize: 16, color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  backTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: 32, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 28, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.primary },
  tagline: { fontSize: 14, color: C.sub, marginTop: 4 },
  version: { fontSize: 12, color: C.sub, marginTop: 4, backgroundColor: C.fill, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  section: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.text, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: C.primary, paddingLeft: 10 },
  bodyText: { fontSize: 14, color: C.sub, lineHeight: 22, marginBottom: 8 },
  bold: { fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12, backgroundColor: C.surface, padding: 12, borderRadius: 12 },
  featureEmoji: { fontSize: 22, marginTop: 2 },
  featureTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.text },
  featureDesc: { fontSize: 12, color: C.sub, marginTop: 2 },
  infoCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: C.primary },
  infoTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', color: C.primary, marginBottom: 12 },
  infoDesc: { fontSize: 14, color: C.sub, lineHeight: 22, marginBottom: 4 },
  highlight: { color: C.primary, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  contactCard: { backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  contactEmoji: { fontSize: 22 },
  contactLabel: { fontSize: 12, color: C.sub },
  contactValue: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.text },
  footer: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  footerText: { fontSize: 13, color: C.sub },
});
