import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/** Writes `content` to a cache file and opens the share sheet so the user can save or send it. */
export async function shareTextFile({
  name,
  content,
  mimeType,
  uti,
  dialogTitle,
}: {
  name: string;
  content: string;
  mimeType: string;
  uti: string;
  dialogTitle: string;
}) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing unavailable', `The file was saved to ${file.uri}`);
    return;
  }
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle });
}
