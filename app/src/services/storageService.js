import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { initializeApp, getApp } from "firebase/app";

export async function uploadBabyPhoto(babyId, base64DataUri) {
  const app = getApp();
  const storage = getStorage(app);
  const storageRef = ref(storage, `babyPhotos/${babyId}/profile.jpg`);
  await uploadString(storageRef, base64DataUri, "data_url");
  const url = await getDownloadURL(storageRef);
  return url;
}
