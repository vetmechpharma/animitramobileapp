/**
 * Export utility — CSV file + PDF sharing
 * Works on Android/iOS (APK). Web uses browser download.
 */
import { Platform, Alert } from 'react-native';

export async function exportAsCSV(csvData: string, filename: string, title: string) {
  if (Platform.OS === 'web') {
    // Web: trigger browser download
    try {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      Alert.alert('Download', 'Please use the app on your phone to export files.');
    }
    return;
  }

  // Native: write file and share
  try {
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, csvData, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: title,
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Sharing not available', 'Please check your device sharing settings.');
    }
  } catch (e: any) {
    Alert.alert('Export Error', e.message || 'Could not export file');
  }
}

export async function exportAsPDF(rows: string[][], columns: string[], title: string, filename: string) {
  const tableRows = rows.map(r =>
    `<tr>${r.map(cell => `<td style="border:1px solid #ccc;padding:6px 10px;font-size:12px">${cell || '-'}</td>`).join('')}</tr>`
  ).join('');

  const html = `
    <html><head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h2 { color: #006064; margin-bottom: 4px; }
      p { color: #888; font-size: 12px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #006064; color: #fff; padding: 8px 10px; font-size: 13px; text-align: left; border: 1px solid #ccc; }
      tr:nth-child(even) { background: #f5f5f5; }
    </style>
    </head><body>
    <h2>ANIMitra VET — ${title}</h2>
    <p>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <table>
      <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    </body></html>
  `;

  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
    return;
  }

  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: title,
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (e: any) {
    Alert.alert('PDF Error', e.message || 'Could not create PDF');
  }
}
