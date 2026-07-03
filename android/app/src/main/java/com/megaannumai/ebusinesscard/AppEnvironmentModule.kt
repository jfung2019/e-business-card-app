package com.megaannumai.ebusinesscard

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class AppEnvironmentModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppEnvironment"

  override fun getConstants(): Map<String, Any> =
    mapOf("appEnvironment" to BuildConfig.APP_ENVIRONMENT)
}
