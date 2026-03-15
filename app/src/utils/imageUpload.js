import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export async function pickAndEncodePhoto() {
  if (Platform.OS !== "web") {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return { cancelled: true, error: "Permission to access photos was denied." };
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  });

  if (result.canceled) {
    return { cancelled: true };
  }

  const asset = result.assets?.[0];
  if (!asset?.base64) {
    return { cancelled: true, error: "Could not read photo." };
  }

  const mimeType = asset.mimeType || "image/jpeg";
  return {
    cancelled: false,
    base64: `data:${mimeType};base64,${asset.base64}`,
  };
}
