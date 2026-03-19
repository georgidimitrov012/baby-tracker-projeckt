import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Upload a baby profile photo to Firebase Storage.
 *
 * @param {string} babyId
 * @param {string} base64DataUri  - data:<mime>;base64,<data> string
 * @returns {Promise<string>} public download URL
 */
export async function uploadBabyPhoto(babyId, base64DataUri) {
  const storageRef = ref(storage, `babyPhotos/${babyId}/profile.jpg`);
  await uploadString(storageRef, base64DataUri, "data_url");
  const url = await getDownloadURL(storageRef);
  return url;
}
