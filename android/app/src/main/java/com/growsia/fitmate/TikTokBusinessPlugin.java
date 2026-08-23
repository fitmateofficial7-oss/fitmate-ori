package com.growsia.fitmate;

import android.text.TextUtils;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.tiktok.TikTokBusinessSdk;
import com.tiktok.appevents.base.EventName;
import com.tiktok.appevents.contents.TTAddToCartEvent;
import com.tiktok.appevents.contents.TTAddToWishlistEvent;
import com.tiktok.appevents.contents.TTCheckoutEvent;
import com.tiktok.appevents.contents.TTContentParams;
import com.tiktok.appevents.contents.TTContentsEvent;
import com.tiktok.appevents.contents.TTContentsEventConstants;
import com.tiktok.appevents.contents.TTPurchaseEvent;
import com.tiktok.appevents.contents.TTViewContentEvent;

import java.util.Locale;

/** Capacitor bridge from the FitMate Next.js UI to TikTok App Events SDK. */
@CapacitorPlugin(name = "TikTokBusiness")
public class TikTokBusinessPlugin extends Plugin {

    private boolean runReady(PluginCall call, Runnable action) {
        final boolean alreadyReady = TikTokBusinessManager.isInitialized();
        boolean accepted;
        try {
            accepted = TikTokBusinessManager.runWhenReady(
                getActivity().getApplication(),
                () -> {
                    try {
                        action.run();
                    } catch (Throwable error) {
                        // Analytics must never interrupt an auth/workout/payment flow.
                        Log.w("FitMateTikTok", "Deferred TikTok event failed.", error);
                    }
                }
            );
        } catch (Exception error) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("configured", TikTokBusinessManager.hasCredentials());
            result.put("reason", error.getMessage());
            call.resolve(result);
            return false;
        }

        JSObject result = new JSObject();
        result.put("success", accepted);
        result.put("configured", accepted);
        result.put("queued", accepted && !alreadyReady);
        if (!accepted) {
            result.put("reason", "TikTok SDK credentials are not configured.");
        }
        // Resolve immediately; TikTok initialization/network failures must never leave the web flow waiting.
        call.resolve(result);
        return accepted;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("configured", TikTokBusinessManager.hasCredentials());
        result.put("initialized", TikTokBusinessManager.isInitialized());
        result.put("reason", TikTokBusinessManager.getInitializationError());
        call.resolve(result);
    }

    @PluginMethod
    public void identify(PluginCall call) {
        String externalId = call.getString("externalId");
        if (TextUtils.isEmpty(externalId)) {
            call.reject("externalId is required.");
            return;
        }

        String externalUserName = call.getString("externalUserName");
        String phoneNumber = call.getString("phoneNumber");
        String email = call.getString("email");

        runReady(call, () -> TikTokBusinessSdk.identify(
            externalId,
            emptyToNull(externalUserName),
            emptyToNull(phoneNumber),
            emptyToNull(email)
        ));
    }

    @PluginMethod
    public void refreshIdentity(PluginCall call) {
        String externalId = call.getString("externalId");
        if (TextUtils.isEmpty(externalId)) {
            call.reject("externalId is required.");
            return;
        }

        String externalUserName = call.getString("externalUserName");
        String phoneNumber = call.getString("phoneNumber");
        String email = call.getString("email");

        runReady(call, () -> {
            TikTokBusinessSdk.logout();
            TikTokBusinessSdk.identify(
                externalId,
                emptyToNull(externalUserName),
                emptyToNull(phoneNumber),
                emptyToNull(email)
            );
        });
    }

    @PluginMethod
    public void logout(PluginCall call) {
        runReady(call, TikTokBusinessSdk::logout);
    }

    @PluginMethod
    public void trackStandardEvent(PluginCall call) {
        String eventName = call.getString("eventName");
        if (TextUtils.isEmpty(eventName)) {
            call.reject("eventName is required.");
            return;
        }

        EventName parsed;
        try {
            parsed = EventName.valueOf(eventName.trim().toUpperCase(Locale.US));
        } catch (IllegalArgumentException error) {
            call.reject("Unsupported TikTok standard event: " + eventName);
            return;
        }

        String eventId = call.getString("eventId");
        runReady(call, () -> {
            if (TextUtils.isEmpty(eventId)) {
                TikTokBusinessSdk.trackTTEvent(parsed);
            } else {
                TikTokBusinessSdk.trackTTEvent(parsed, eventId);
            }
        });
    }

    @PluginMethod
    public void trackCommerceEvent(PluginCall call) {
        String eventName = call.getString("eventName");
        if (TextUtils.isEmpty(eventName)) {
            call.reject("eventName is required.");
            return;
        }

        String normalized = eventName.trim().toUpperCase(Locale.US);
        String eventId = call.getString("eventId");
        String description = call.getString("description");
        String contentId = call.getString("contentId");
        String contentCategory = call.getString("contentCategory");
        String brand = call.getString("brand");
        String contentName = call.getString("contentName");
        String contentType = call.getString("contentType");
        Double value = call.getDouble("value");
        Double price = call.getDouble("price");
        Integer quantity = call.getInt("quantity");
        String currencyValue = call.getString("currency", "IDR");

        TTContentsEventConstants.Currency currency;
        try {
            currency = TTContentsEventConstants.Currency.valueOf(currencyValue.toUpperCase(Locale.US));
        } catch (IllegalArgumentException error) {
            call.reject("Unsupported ISO 4217 currency: " + currencyValue);
            return;
        }

        runReady(call, () -> {
            TTContentsEvent.Builder builder = createCommerceBuilder(normalized, eventId);
            if (builder == null) {
                throw new IllegalArgumentException("Unsupported commerce event: " + eventName);
            }

            if (!TextUtils.isEmpty(description)) builder.setDescription(description);
            builder.setCurrency(currency);
            if (value != null) builder.setValue(value);
            if (!TextUtils.isEmpty(contentType)) builder.setContentType(contentType);
            if (!TextUtils.isEmpty(contentId)) builder.setContentId(contentId);

            TTContentParams.Builder contentBuilder = TTContentParams.newBuilder();
            boolean hasContent = false;
            if (!TextUtils.isEmpty(contentId)) {
                contentBuilder.setContentId(contentId);
                hasContent = true;
            }
            if (!TextUtils.isEmpty(contentCategory)) {
                contentBuilder.setContentCategory(contentCategory);
                hasContent = true;
            }
            if (!TextUtils.isEmpty(brand)) {
                contentBuilder.setBrand(brand);
                hasContent = true;
            }
            if (!TextUtils.isEmpty(contentName)) {
                contentBuilder.setContentName(contentName);
                hasContent = true;
            }
            if (price != null) {
                contentBuilder.setPrice(price.floatValue());
                hasContent = true;
            }
            if (quantity != null) {
                contentBuilder.setQuantity(quantity);
                hasContent = true;
            }
            if (hasContent) builder.setContents(contentBuilder.build());

            TikTokBusinessSdk.trackTTEvent(builder.build());
        });
    }

    private TTContentsEvent.Builder createCommerceBuilder(String eventName, String eventId) {
        boolean hasEventId = !TextUtils.isEmpty(eventId);
        switch (eventName) {
            case "CHECKOUT":
                return hasEventId ? TTCheckoutEvent.newBuilder(eventId) : TTCheckoutEvent.newBuilder();
            case "PURCHASE":
                return hasEventId ? TTPurchaseEvent.newBuilder(eventId) : TTPurchaseEvent.newBuilder();
            case "ADD_TO_WISHLIST":
                return hasEventId ? TTAddToWishlistEvent.newBuilder(eventId) : TTAddToWishlistEvent.newBuilder();
            case "ADD_TO_CART":
                return hasEventId ? TTAddToCartEvent.newBuilder(eventId) : TTAddToCartEvent.newBuilder();
            case "VIEW_CONTENT":
                return hasEventId ? TTViewContentEvent.newBuilder(eventId) : TTViewContentEvent.newBuilder();
            default:
                return null;
        }
    }

    private String emptyToNull(String value) {
        return TextUtils.isEmpty(value) ? null : value;
    }
}
