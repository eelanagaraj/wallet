package org.celo.mobile;

import android.content.Context;
import android.util.Log;
import androidx.multidex.MultiDexApplication;
import cl.json.ShareApplication;
import com.clevertap.android.sdk.ActivityLifecycleCallback;
import com.clevertap.android.sdk.CleverTapAPI;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.swmansion.reanimated.ReanimatedJSIModulePackage;
import io.sentry.react.RNSentryPackage;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class MainApplication
  extends MultiDexApplication
  implements ShareApplication, ReactApplication {
  static final String TAG = "MainApplication";

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {

    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();
      return packages;
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }

    @Override
    protected JSIModulePackage getJSIModulePackage() {
      return new ReanimatedJSIModulePackage();
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    // CleverTap setup
    ActivityLifecycleCallback.register(this);

    super.onCreate();
    SoLoader.init(this, /* native exopackage */false);
    initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
  }

  @Override
  public String getFileProviderAuthority() {
    return BuildConfig.APPLICATION_ID + ".provider";
  }

  /**
   * Loads Flipper in React Native templates. Call this in the onCreate method
   * with something like initializeFlipper(this,
   * getReactNativeHost().getReactInstanceManager());
   *
   * @param context
   * @param reactInstanceManager
   */
  private static void initializeFlipper(
    Context context,
    ReactInstanceManager reactInstanceManager
  ) {
    if (BuildConfig.DEBUG) {
      try {
        /*
         * We use reflection here to pick up the class that initializes Flipper, since
         * Flipper library is not available in release mode
         */
        Class<?> aClass = Class.forName("org.celo.mobile.ReactNativeFlipper");
        aClass
          .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
          .invoke(null, context, reactInstanceManager);
      } catch (ClassNotFoundException e) {
        e.printStackTrace();
      } catch (NoSuchMethodException e) {
        e.printStackTrace();
      } catch (IllegalAccessException e) {
        e.printStackTrace();
      } catch (InvocationTargetException e) {
        e.printStackTrace();
      }
    }
  }
}
