"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

type MediaSaverPlugin = {
  saveMedia(options: {
    base64Data: string;
    fileName: string;
    mimeType: string;
  }): Promise<{
    uri: string;
    album?: string;
  }>;
};

const MediaSaver = registerPlugin<MediaSaverPlugin>("MediaSaver");

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

export function isNativeGallerySaveAvailable() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android" &&
    Capacitor.isPluginAvailable("MediaSaver")
  );
}

/**
 * Saves generated FitMate media to Android shared media storage.
 * Android 10+ writes to Pictures/FitMate or Movies/FitMate through MediaStore.
 * Browsers and unsupported native versions return null so callers can use the
 * ordinary browser download fallback.
 */
export async function saveMediaToNativeGallery(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<{ uri: string; album?: string } | null> {
  if (!isNativeGallerySaveAvailable()) {
    return null;
  }

  const buffer = await blob.arrayBuffer();
  const base64Data = arrayBufferToBase64(buffer);

  try {
    return await MediaSaver.saveMedia({
      base64Data,
      fileName,
      mimeType,
    });
  } catch (error) {
    // Android 9 and older intentionally fall back to browser download so the
    // app does not request broad storage permission on modern Play builds.
    console.warn("FitMate native gallery save failed; using browser fallback.", error);
    return null;
  }
}
