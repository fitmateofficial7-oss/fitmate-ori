package com.growsia.fitmate;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "MediaSaver")
public class MediaSaverPlugin extends Plugin {
    @PluginMethod
    public void saveMedia(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("FitMate gallery saving requires Android 10 or newer.");
            return;
        }

        String base64Data = call.getString("base64Data");
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Missing media data.");
            return;
        }
        if (fileName == null || fileName.isEmpty()) {
            call.reject("Missing file name.");
            return;
        }
        if (mimeType == null || mimeType.isEmpty()) {
            call.reject("Missing MIME type.");
            return;
        }

        boolean isVideo = mimeType.startsWith("video/");
        boolean isImage = mimeType.startsWith("image/");
        if (!isVideo && !isImage) {
            call.reject("Only image and video media can be saved to the gallery.");
            return;
        }

        fileName = fileName.replaceAll("[\\\\/:*?\"<>|]", "_");

        ContentResolver resolver = getContext().getContentResolver();
        Uri collection = isVideo
            ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            : MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        String topDirectory = isVideo
            ? Environment.DIRECTORY_MOVIES
            : Environment.DIRECTORY_PICTURES;

        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, topDirectory + "/FitMate");
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri uri = null;
        try {
            uri = resolver.insert(collection, values);
            if (uri == null) {
                call.reject("Android could not create the media item.");
                return;
            }

            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            try (OutputStream outputStream = resolver.openOutputStream(uri, "w")) {
                if (outputStream == null) {
                    resolver.delete(uri, null, null);
                    call.reject("Android could not open the gallery destination.");
                    return;
                }
                outputStream.write(bytes);
                outputStream.flush();
            }

            ContentValues completed = new ContentValues();
            completed.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(uri, completed, null, null);

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            result.put("album", "FitMate");
            call.resolve(result);
        } catch (Exception error) {
            if (uri != null) {
                try {
                    resolver.delete(uri, null, null);
                } catch (Exception ignored) {
                    // Best-effort cleanup only.
                }
            }
            call.reject("Unable to save FitMate media to the Android gallery.", error);
        }
    }
}
