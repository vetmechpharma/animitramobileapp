import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, Image, TouchableOpacity,
  StyleSheet, Dimensions, Linking, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANNER_KEY = '@animitra/banner_shown_date';
const { width, height } = Dimensions.get('window');

interface BannerProps {
  token: string;
  backendUrl: string;
}

export default function AdBanner({ token, backendUrl }: BannerProps) {
  const [banner, setBanner] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    checkAndShow();
  }, []);

  const checkAndShow = async () => {
    try {
      // Check if already shown today
      const lastShown = await AsyncStorage.getItem(BANNER_KEY);
      const today = new Date().toDateString();
      if (lastShown === today) return; // Already shown today

      // Fetch active banner
      const res = await fetch(`${backendUrl}/api/banners/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.banner) {
        setBanner(data.banner);
        setVisible(true);
        // Mark as shown today
        await AsyncStorage.setItem(BANNER_KEY, today);
      }
    } catch (e) {
      // Silently fail — don't block app
    }
  };

  const handleClose = () => setVisible(false);

  const handleClick = async () => {
    if (banner?.link_url) {
      try {
        await Linking.openURL(banner.link_url);
      } catch (e) {}
    }
    setVisible(false);
  };

  if (!visible || !banner) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          {/* Close button */}
          <TouchableOpacity testID="banner-close" style={s.closeBtn} onPress={handleClose}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Banner Image */}
          <TouchableOpacity testID="banner-click" activeOpacity={0.9} onPress={handleClick}>
            {imgLoading && (
              <View style={s.imgPlaceholder}>
                <ActivityIndicator color="#2E7D32" />
              </View>
            )}
            <Image
              source={{ uri: banner.image_url }}
              style={[s.bannerImg, imgLoading && { opacity: 0 }]}
              resizeMode="contain"
              onLoadEnd={() => setImgLoading(false)}
              onError={() => setImgLoading(false)}
            />
          </TouchableOpacity>

          {/* Title + CTA */}
          {banner.title ? (
            <Text style={s.title}>{banner.title}</Text>
          ) : null}

          {banner.link_url ? (
            <TouchableOpacity testID="banner-cta" style={s.ctaBtn} onPress={handleClick}>
              <Text style={s.ctaBtnText}>Learn More →</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={s.hint}>Tap image to open · Shows once per day</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  container: {
    backgroundColor: '#fff', borderRadius: 20, width: '100%',
    overflow: 'hidden', maxWidth: 420,
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 10, zIndex: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  bannerImg: { width: '100%', height: width * 0.55, backgroundColor: '#F4F9F4' },
  imgPlaceholder: {
    width: '100%', height: width * 0.55,
    backgroundColor: '#F4F9F4', justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1A2E1C',
    paddingHorizontal: 16, paddingTop: 12, textAlign: 'center',
  },
  ctaBtn: {
    marginHorizontal: 20, marginTop: 10, marginBottom: 6,
    backgroundColor: '#2E7D32', borderRadius: 12, paddingVertical: 10,
    alignItems: 'center',
  },
  ctaBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  hint: {
    fontSize: 11, color: '#8FA891', fontFamily: 'Inter_400Regular',
    textAlign: 'center', paddingBottom: 12, paddingTop: 4,
  },
});
