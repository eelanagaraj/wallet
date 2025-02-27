# Mobile (Valora)

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup](#setup)
  - [iOS](#ios)
    - [Enroll in the Apple Developer Program](#enroll-in-the-apple-developer-program)
    - [Install Xcode](#install-xcode)
    - [Install Cocopods, Bundler, and download project dependencies](#install-cocopods-bundler-and-download-project-dependencies)
  - [Android](#android)
    - [Install Java](#install-java)
    - [Install Android Dev Tools](#install-android-dev-tools)
    - [Optional: Install an Android emulator](#optional-install-an-android-emulator)
- [Running the mobile wallet](#running-the-mobile-wallet)
  - [iOS](#ios-1)
  - [Android](#android-1)
  - [Running in forno (data saver) mode](<#running-in-forno-(data-saver)-mode>)
- [Debugging & App Profiling](#debugging--app-profiling)
  - [Debugging](#debugging)
    - [Optional: Install React Native Debugger](#optional-install-react-native-debugger)
  - [App Profiling](#app-profiling)
- [Testing](#testing)
  - [Snapshot testing](#snapshot-testing)
  - [React component unit testing](#react-component-unit-testing)
  - [Saga testing](#saga-testing)
  - [End-to-End testing](#end-to-end-testing)
- [Building APKs / Bundles](#building-apks--bundles)
  - [Creating a fake keystore](#creating-a-fake-keystore)
  - [Building an APK or Bundle](#building-an-apk-or-bundle)
- [Other](#other)
  - [Localization (l10n) / translation process](#localization-l10n--translation-process)
  - [Configuring the SMS Retriever](#configuring-the-sms-retriever)
  - [Generating GraphQL Types](#generating-graphql-types)
  - [How we handle Geth crashes in wallet app on Android](#how-we-handle-geth-crashes-in-wallet-app-on-android)
  - [Why do we use http(s) provider?](#why-do-we-use-https-provider)
  - [Attaching to the geth instance](#attaching-to-the-geth-instance)
  - [Helpful hints for development](#helpful-hints-for-development)
  - [Troubleshooting](#troubleshooting)
    - [`Activity class {org.celo.mobile.staging/org.celo.mobile.MainActivity} does not exist.`](#activity-class-orgcelomobilestagingorgcelomobilemainactivity-does-not-exist)

## Overview

This package contains the code for the Valora mobile apps for Android and iOS.
Valora is a self-sovereign wallet that enables anyone to onboard onto the Celo network, manage their currencies, and send payments.

## Architecture

The app uses [React Native][react native] and a geth [light node][light node].

## Setup

**You must have the [monorepo](https://github.com/celo-org/celo-monorepo) successfully set up and built before setting up and running the mobile wallet.** To do this, follow the [setup instructions](https://github.com/celo-org/celo-monorepo/blob/master/SETUP.md).

Next, install [watchman][watchman] and [jq][jq]

```bash
# On a mac
brew install watchman
brew install jq
```

### Repository secrets

#### For Valora employees only

_This is only for Valora employees._

You will need to be added the team keyring on GCP so you can decrypt secrets in the repo. (Ask for an invite to `celo-mobile-alfajores`.)

Once you have access, install Google Cloud by running `brew install google-cloud-sdk`.
Follow instructions [here](https://cloud.google.com/sdk/gcloud/reference/auth/login)
for logging in with Google credentials.

To test your GCP access, try running `yarn keys:decrypt` from the wallet repo root. You should see something like this: `Encrypted files decrypted`.
(You will not need to run this command on an ongoing basis, since it is done automatically as part of the `postinstall` script.)

#### For External contributors

External contributors don't need to decrypt repository secrets and can successfully build and run the mobile application with the following differences:

- the default branding will be used (some images/icons will appear in pink or will be missing)
- Firebase related features needs to be disabled. You can do this by setting `FIREBASE_ENABLED=false` in the `packages/mobile/.env.*` files.

### iOS

#### Enroll in the Apple Developer Program

In order to successfully set up your iOS development environment you will need to enroll in the [Apple Developer Program]. It is recommended that you enroll from an iOS device by downloading the Apple Developer App in the App Store. Using the app will result in the fastest processing of your enrollment.

_If you are a Valora employee, please ask to be added to the Valora iOS development team._

#### Install Xcode

Xcode is needed to build and deploy the mobile wallet to your iOS device. If you do not have an iOS device, Xcode can be used to emulate one.

Install [Xcode 12.2](https://developer.apple.com/download/more/?q=xcode) (an Apple Developer Account is needed to access this link).

We do not recommend installing Xcode through the App Store as it can auto update and become incompatible with our projects.

Note that using the method above, you can have multiple versions of Xcode installed in parallel if you'd like. Simply use different names for the different version of Xcode in your computer's `Applications` folder (e.g., `Xcode10.3.app` and `Xcode11.app`).

#### Install Cocopods, Bundler, and download project dependencies

Make sure you are in the `ios` directory of the `mobile` package before running the following:

```bash
# install cocopods and bundler if you don't already have it
gem install cocoapods
gem install bundler
# download the project dependencies in mobile/
bundle install
# run inside mobile/ios
bundle exec pod install
```

If your machine does not recognize the `gem` command, you may need to [download Ruby](https://rubyinstaller.org/) first.

1. Run `yarn install` in the monorepo root `/wallet`.
2. Run `yarn build:wallet` from the monorepo root `/wallet`.
3. Run `yarn dev:ios` in the `/wallet/packages/mobile` folder.

And the app should be running in the simulator! If you run into any issues, see below for troubleshooting.

### Android

#### Install Java

We need Java to be able to build and deploy the mobile app to Android devices. Android currently only builds correctly with Java 8. (Using OpenJDK because of [Oracle being Oracle][oracle being oracle]).

##### MacOS

Install by running the following:

```bash
brew install cask
brew tap homebrew/cask-versions
brew install --cask homebrew/cask-versions/adoptopenjdk8
```

Optionally, install Jenv to manage multiple Java versions:

```bash
brew install jenv
eval "$(jenv init -)"
# next step assumes openjdk8 already installed
jenv add /Library/Java/JavaVirtualMachines/adoptopenjdk-8.jdk/Contents/Home/
```

##### Linux

Install by running the following:

```
sudo apt install openjdk-8-jdk
```

#### Install Android Dev Tools

##### MacOS

Install the Android SDK and platform tools:

```bash
brew install --cask android-sdk
brew install --cask android-platform-tools
```

Next install [Android Studio][android studio] and add the [Android NDK][android ndk] (if you run into issues with the toolchain, try using version: 22.x).

Execute the following (and make sure the lines are in your `~/.bash_profile`).

_Note that these paths may differ on your machine. You can find the path to the SDK and NDK via the [Android Studio menu](https://stackoverflow.com/questions/40520324/how-to-find-the-path-to-ndk)._

```bash
export ANDROID_HOME=${YOUR_ANDROID_SDK_PATH}
export ANDROID_NDK=$ANDROID_HOME/ndk-bundle
export ANDROID_SDK_ROOT=$ANDROID_HOME
# this is an optional gradle configuration that should make builds faster
export GRADLE_OPTS='-Dorg.gradle.daemon=true -Dorg.gradle.parallel=true -Dorg.gradle.jvmargs="-Xmx4096m -XX:+HeapDumpOnOutOfMemoryError"'
export TERM_PROGRAM=iterm  # or whatever your favorite terminal program is
```

Then install the Android 29 platform:

```bash
sdkmanager 'platforms;android-29'
```

##### Linux

You can download the complete Android Studio and SDK from the [Android Developer download site](https://developer.android.com/studio/#downloads).

You can find the complete instructions about how to install the tools in Linux environments in the [Documentation page](https://developer.android.com/studio/install#linux).

Set the following environment variables and optionally add to your shell profile (_e.g._, `.bash_profile`):

```bash
export ANDROID_HOME=/usr/local/share/android-sdk
export ANDROID_SDK_ROOT=/usr/local/share/android-sdk
# this is an optional gradle configuration that should make builds faster
export GRADLE_OPTS='-Dorg.gradle.daemon=true -Dorg.gradle.parallel=true -Dorg.gradle.jvmargs="-Xmx4096m -XX:+HeapDumpOnOutOfMemoryError"'
# this is used to launch the react native packager in its own terminal
export TERM_PROGRAM=xterm  # or whatever your favorite terminal is
```

#### Optional: Install an Android emulator

##### Configure an emulator using the Android SDK Manager

Set your `PATH` environment variable and optionally update your shell profile (_e.g._, `.bash_profile`):

```bash
export PATH=$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH
```

Install the Android 29 system image and create an Android Virtual Device:

```bash
sdkmanager "system-images;android-29;default;x86_64"
avdmanager create avd --force --name Pixel_API_29_AOSP_x86_64 --device pixel -k "system-images;android-29;default;x86_64"
```

Run the emulator with:

```bash
emulator -avd Pixel_API_29_AOSP_x86_64
```

##### Install Genymotion Emulator Manager

Another Android emulator option is Genymotion.

###### MacOS

```bash
brew install --cask genymotion
```

Under OSX High Sierra and later, you'll get a message that you need to
[approve it in System Preferences > Security & Privacy > General][approve kernel extension].

Do that, and then repeat the line above.

Then make sure the ADB path is set correctly in Genymotion — set
`Preferences > ADB > Use custom Android SDK tools` to
`/usr/local/share/android-sdk` (same as `$ANDROID_HOME`)

###### Linux

You can download the Linux version of Genymotion from the [fun zone!](https://www.genymotion.com/fun-zone/) (you need to sign in first).

After having the binary you only need to run the installer:

```
sudo ./genymotion-3.0.2-linux_x64.bin
```

## Running the mobile wallet

The below steps should help you successfully run the mobile wallet on either a USB connected or emulated device. For additional information and troubleshooting see the [React Native docs][rn running on device].

**Note:** We've seen some issues running the metro bundler from iTerm

1. If you haven't already, run `yarn` and then `yarn build` from the monorepo root to install and build dependencies.

2. Attach your device or start an emulated one.

### iOS

3. Launch Xcode and use it to open the directory `celo.xcworkspace`. Confirm your iOS device has been detected by Xcode.

4. Build the project by pressing the play button in the top left corner or selecting `Product > Build` from the Xcode menu bar.

5. From the `packages/mobile` directory run `yarn run dev:ios`.

### Android

3. Follow [these instructions to enable Developer Options][android dev options] on your Android device.

4. Unplug and replug your device. You'll be prompted to accept the connection and shown a public key (corresponding to the `abd_key.pub` file in `~/.android`)

5. To confirm your device is properly connected, running `adb devices` from the terminal should reflect your connected device. If it lists a device as "unauthorized", make sure you've accepted the prompt or [troubleshoot here][device unauthorized].

6. From the `packages/mobile` directory run `yarn run dev:android`.

### Running on Mainnet

By default, the mobile wallet app runs on celo's testnet `alfajores`. To run the app on `mainnet`, supply an env flag, eg. `yarn run dev:ios -e mainnet`. The command will then run the app with the env file `.env.mainnet`.

### Running in forno (data saver) mode

By default, the mobile wallet app runs geth in lightest sync mode where all the epoch headers are fetched. The default sync mode is defined in by `SYNC_DEFAULT_MODE` in the `.env` files in [wallet/packages/mobile](wallet/packages/mobile).

To run the wallet in forno (Data Saver) mode, using a trusted node rather than the local geth node as a provider, turn it on from the Data Saver page in settings or update the `FORNO_ENABLED_INITIALLY` parameter in the .env file linked above. When forno mode is turned back off, the wallet will switch to the default sync mode as specified in the .env file. By default, the trusted node is `https://{TESTNET}-forno.celo-testnet.org`, however any trusted node can be used by updating `DEFAULT_FORNO_URL`. In forno mode, the wallet signs transactions locally in web3 then sends them to the trusted node.

To debug network requests in forno mode, we use Charles, a proxy for monitoring network traffic to see Celo JSON RPC calls and responses. Follow instructions [here](https://community.tealiumiq.com/t5/Tealium-for-Android/Setting-up-Charles-to-Proxy-your-Android-Device/ta-p/5121) to configure Charles to proxy a test device.

## Debugging & App Profiling

### Debugging

Since we integrated dependencies making use of TurboModules, debugging via Chrome DevTools or React Native Debugger doesn't work anymore.
As an alternative, Flipper can be used instead.

#### Install Flipper

[Flipper][flipper] is a platform for debugging iOS, Android and React Native apps. Visualize, inspect, and control your apps from a simple desktop interface. Download on the web or through brew.

```sh
brew install flipper
```

As of Jan 2021, Flipper is not notarized and triggers a MacOS Gatekeeper popup when trying to run it for the first time.
Follow [these steps to successfully launch it](https://github.com/facebook/flipper/issues/1308#issuecomment-652951556) (only needed the very first time it's run)

The application currently makes use of 2 additional Flipper plugins to enable more detailed debugging:

- Reactotron (Flipper -> Manage Plugins -> Install Plugins -> flipper-plugin-reactotron)
- Redux Debugger (Flipper -> Manage Plugins > Install Plugins > search redux-debugger)

Once installed, you should be able to see them and interact with them when the wallet is running (only in dev builds).

This allows viewing / debugging the following:

- React DevTools (Components and Profiling)
- Network connections
- View hierarchy
- Redux State / Actions
- AsyncStorage
- App preferences
- Hermes
- and more ;)

### App Profiling

Run `yarn run react-devtools`. It should automatically connect to the running app, and includes a profiler (second tab). Start recording with the profiler, use the app, and then stop recording.

The flame graph provides a view of each component and sub-component. The width is proportional to how long it took to load. If it is grey, it was not re-rendered at that 'commit' or DOM change. Details on the react native profiler are [here][rn profiler]. The biggest thing to look for are large number of renders when no state has changed. Reducing renders can be done via pure components in React or overloading the should component update method [example here][rn optimize example].

## Testing

To execute the suite of tests, run `yarn test`.

### Snapshot testing

We use Jest [snapshot testing][jest] to assert that no intentional changes to the
component tree have been made without explicit developer intention. See an
example at [`src/send/SendAmount.test.tsx`]. If your snapshot is expected
to deviate, you can update the snapshot with the `-u` or `--updateSnapshot`
flag when running the test.

### React component unit testing

We use [react-native-testing-library][react-native-testing-library] and [@testing-library/jest-native][@testing-library/jest-native] to unit test
react components. It allows for deep rendering and interaction with the rendered
tree to assert proper reactions to user interaction and input. See an example at
[`src/send/SendAmount.test.tsx`] or read more about the [docs][rntl-docs].

To run a single component test file: `yarn test Send.test.tsx`

### Saga testing

We use [redux-saga-test-plan][redux-saga-test-plan] to test complex sagas.
See [`src/identity/verification.test.ts`] for an example.

### End-to-End testing

We use [Detox][detox] for E2E testing. In order to run the tests locally, you
must have the proper emulator set up. Follow the instructions in [e2e/README.md][e2e readme].

Once setup is done, you can run the tests with `yarn test:e2e:android` or `yarn test:e2e:ios`.
If you want to run a single e2e test: `yarn test:e2e:ios -f Exchange.spec.js -t "Then Buy CELO"`

## Building APKs / Bundles

You can create your own custom build of the app via the command line or in Android Studio. For an exact set of commands, refer to the lanes in `fastlane/FastFile`. For convenience, the basic are described below:

### Creating a fake keystore

If you have not yet created a keystore, one will be required to generate a release APKs / bundles:

```sh
cd android/app
keytool -genkey -v -keystore celo-release-key.keystore -alias celo-key-alias -storepass celoFakeReleaseStorePass -keypass celoFakeReleaseKeyPass -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
export CELO_RELEASE_STORE_PASSWORD=celoFakeReleaseStorePass
export CELO_RELEASE_KEY_PASSWORD=celoFakeReleaseKeyPass
```

### Building an APK or Bundle

```sh
# With fastlane:
bundle install
bundle exec fastlane android build_apk env:YOUR_BUILDING_VARIANT

# Or, manually
cd android/
./gradlew clean
./gradlew bundle{YOUR_BUILDING_VARIANT}JsAndAssets
# For an APK:
./gradlew assemble{YOUR_BUILDING_VARIANT} -x bundle{YOUR_BUILDING_VARIANT}JsAndAssets
# Or for a bundle:
./gradlew bundle{YOUR_BUILDING_VARIANT} -x bundle{YOUR_BUILDING_VARIANT}JsAndAssets
```

Where `YOUR_BUILD_VARIANT` can be any of the app's build variants, such as debug or release.

## Other

### Localization (l10n) / translation process

We are using [Crowdin](https://clabs.crowdin.com/) to manage the translation of all user facing strings in the app.

During development, developers should only update the language files in the base locale. These are the source files for Crowdin.

The `main` branch of this repository is automatically synced with our Crowdin project. Source files in Crowdin are updated automatically and ready translations are pushed as a pull request.

Translation process overview:

1. Developers update the base strings in English (in `packages/mobile/locales/base`) in the branch they are working on.
1. When the corresponding PR is merged into `main`, Crowdin integration automatically picks up changes to the base strings.
1. Crowdin then auto translates the new strings and opens a PR with them from the `l10n/main` branch
1. We can then manually check and edit the translated strings in the Crowdin UI. The changes will be reflected in the PR after 10 mins.
1. When we are happy with the changes, we can merge the PR and delete the related `l10n/main` branch to avoid possible future conflicts. Once new translations are made in Crowdin, a new `l10n/main` branch will be automatically created again.

When making a release, we should make sure there are no outstanding translation changes not yet merged into `main`.
i.e. no Crowdin PR open and the translation status for all supported languages is at 100% and approved on Crowdin.

Note that Crowdin Over-The-Air (OTA) content delivery is used to push live translation updates to the app. As only target languages are included in the Crowdin OTA distribution, English is set up as a target language as well as the source. This is a necessary implementation detail to prevent bi-directional sync between Crowdin and Github. The translated English strings (in `packages/mobile/locales/en`) are only to receive the OTA translations, and it is not necessary to consume or edit them otherwise within the app.

### Configuring the SMS Retriever

On Android, the wallet app uses the SMS Retriever API to automatically input codes during phone number verification. When creating a new app build type this needs to be properly configured.

The service that route SMS messages to the app needs to be configured to [append this app signature to the message][sms retriever]. The hash depends on both the bundle id and the signing certificate. Since we use Google Play signing, we need to download the certificate.

1.  Go to the play console for the relevant app, Release management > App signing, and download the App signing certificate.
2.  Use this script to generate the hash code: https://github.com/michalbrz/sms-retriever-hash-generator

### Generating GraphQL Types

We're using [GraphQL Code Generator][graphql code generator] to properly type GraphQL queries. If you make a change to a query, run `yarn build:gen-graphql-types` to update the typings in the `typings` directory.

### How we handle Geth crashes in wallet app on Android

Our Celo app has three types of codes.

1. Javascript code - generated from Typescript, this runs in Javascript interpreter.
2. Java bytecode - this runs on Dalvik/Art Virtual Machine.
3. Native code - Geth code is written in Golang which compiles to native code, this runs directly on the CPU, no virtual machines involved.

One should note that, on iOS, there is no byte code and therefore, there are only two layers, one is the Javascript code, and the other is the Native code. Till now, we have been blind towards native crashes except Google Playstore logs.

Sentry, the crash logging mechanism we use, can catch both Javascript Errors as well as unhandled Java exceptions. It, however, does not catch Native crashes. There are quite a few tools to catch native crashes like [Bugsnag](https://www.bugsnag.com) and [Crashlytics](https://firebase.google.com/products/crashlytics). They would have worked for us under normal circumstances. However, the Geth code produced by the Gomobile library and Go compiler logs a major chunk of information about the crash at Error level and not at the Fatal level. We hypothesize that this leads to incomplete stack traces showing up in Google Play store health checks. This issue is [publicly known](https://github.com/golang/go/issues/25035) but has not been fixed.

We cannot use libraries like [Bugsnag](https://www.bugsnag.com) since they do not allow us to extract logcat logs immediately after the crash. Therefore, We use [jndcrash](https://github.com/ivanarh/jndcrash), which uses [ndcrash](https://github.com/ivanarh/ndcrash) and enable us to log the logcat logs immediately after a native crash. We capture the results into a file and on next restart Sentry reads it. We need to do this two-step setup because once a native crash happens, running code to upload the data would be fragile. An error in sentry looks like [this](https://sentry.io/organizations/celo/issues/918120991/events/48285729031/)

There are two major differences in Forno mode:

1.  Geth won't run at all. Instead, web3 connects to <testnet>-forno.celo-testnet.org using an https provider, for example, [https://integration-forno.celo-testnet.org](https://integration-forno.celo-testnet.org).
2.  Transactions will be signed locally by contractkit.

### Why do we use http(s) provider?

Websockets (`ws`) would have been a better choice but we cannot use unencrypted `ws` provider since it would be bad to send plain-text data from a privacy perspective. Geth does not support `wss` by [default](https://github.com/ethereum/go-ethereum/issues/16423). And Kubernetes does not support it either. This forced us to use https provider.

### Attaching to the geth instance

#### Android

1. Start geth's HTTP RPC server by setting the config variable `GETH_START_HTTP_RPC_SERVER` to true. This is meant for development purposes only and can be a serious vulnerability if used in production.
2. Forward traffic from your computer's port 8545 to the android device's: `adb forward tcp:8545 tcp:8545`
3. Using a geth binary on your computer, run `geth attach http://localhost:8545`

#### iOS

We need the IP address of the iOS device. If it is being run in a simulator, the IP address is `127.0.0.1`. If not running in a simulator:

1. Ensure the iOS device is on the same network as your computer.
2. Find the device's local IP address by going to the Settings app, Wi-Fi, and tapping the 'i' next to the network.

To attach:

1. Start geth's HTTP RPC server by setting the config variable `GETH_START_HTTP_RPC_SERVER` to true. This is meant for development purposes only and can be a serious vulnerability if used in production.
2. Using a geth binary on your computer, run `geth attach http://<DEVICE_IP_ADDRESS>:8545`

### Helpful hints for development

We try to minimise the differences between running Valora in different modes and environments, however there are a few helpful things to know when developing the app.

- Valora uses Crowdin Over-The-Air (OTA) content delivery to enable dynamic translation updates. The OTA translations are cached and used on subsequent app loads instead of the strings in the translation files of the app bundle. This means that during development, the app will not respond to manual changes of the translation.json files.
- In development mode, analytics are disabled.

### Troubleshooting

#### Postinstall script

If you're having an error with installing packages, or `secrets.json` not existing:

try to run `yarn postinstall` in the wallet root folder after running `yarn install`.

A successful `yarn postinstall` looks like:

```
$ yarn postinstall
yarn run v1.22.10
$ yarn run lerna run postinstall && patch-package && yarn keys:decrypt
$ /Users/michewong/development/wallet/node_modules/.bin/lerna run postinstall
lerna notice cli v3.16.0
lerna info versioning independent
lerna info Executing command in 1 package: "yarn run postinstall"
lerna info run Ran npm script 'postinstall' in '@celo/mobile' in 1.5s:
$ ./scripts/sync_branding.sh && ./scripts/copy_license_to_android_assets.sh
.
~/development/wallet/packages/mobile/branding/valora ~/development/wallet/packages/mobile
~/development/wallet/packages/mobile
Using branding/valora
building file list ... done
ios/

sent 6907 bytes  received 26 bytes  13866.00 bytes/sec
total size is 5736337  speedup is 827.40
building file list ... done

sent 96 bytes  received 20 bytes  232.00 bytes/sec
total size is 2762108  speedup is 23811.28
lerna success run Ran npm script 'postinstall' in 1 package in 1.5s:
lerna success - @celo/mobile
patch-package 6.2.2
Applying patches...
@react-native-firebase/database@6.7.1 ✔
@segment/analytics-react-native@1.3.2 ✔
bn.js@4.11.9 ✔
react-native-reanimated@2.0.0-rc.1 ✔
react-native-splash-screen@3.2.0 ✔
react-native-tab-view@2.15.2 ✔
tslint@5.20.0 ✔
$ bash scripts/key_placer.sh decrypt
Processing encrypted files

Encrypted files decrypted
✨  Done in 24.82s.
```

#### Google Cloud Setup (for cLabs employees only)

Make sure to follow the steps [here](https://github.com/celo-org/celo-labs/blob/master/packages/docs/eng-setup.md) to set up Google Cloud correctly with the wallet.

### Branding (for Valora employees only)

Images and icons in Valora are stored in the [branding repo](https://github.com/valora-inc/valora-app-branding). When running `yarn install`, the script `scripts/sync_branding.sh` is run to clone this repo into `branding/valora`, and these assets are then put into `src/images` and `src/icons`. If you do not have access to the branding repo, assets are pulled from `branding/celo`, and are displayed as pink squares instead. The jest tests and CircleCI pipeline also use these default assets.

When adding new images to the [branding repo](https://github.com/valora-inc/valora-app-branding), we also include the 1.5x, 2x, 3x, and 4x versions. The app will automatically download the appropriate size. After making changes to the remote repo, find the commit hash and update it in `scripts/sync_branding.sh`. Make sure to also add the corresponding pink square version of the images to `branding/celo/src/images`. You can do this by copying one of the existing files and renaming it.

#### `Activity class {org.celo.mobile.staging/org.celo.mobile.MainActivity} does not exist.`

From time to time the app refuses to start showing this error:

```text
557 actionable tasks: 525 executed, 32 up-to-date
info Running /usr/local/share/android-sdk/platform-tools/adb -s PL2GARH861213542 reverse tcp:8081 tcp:8081
info Starting the app on PL2GARH861213542 (/usr/local/share/android-sdk/platform-tools/adb -s PL2GARH861213542 shell am start -n org.celo.mobile.staging/org.celo.mobile.MainActivity)...
Starting: Intent { cmp=org.celo.mobile.staging/org.celo.mobile.MainActivity }
Error type 3
Error: Activity class {org.celo.mobile.staging/org.celo.mobile.MainActivity} does not exist.
```

Solution:

```bash
$ adb kill-server && adb start-server
* daemon not running; starting now at tcp:5037
* daemon started successfully
```

[celo platform]: https://celo.org
[wallet]: https://github.com/celo-org/wallet
[celo-blockchain]: https://github.com/celo-org/celo-blockchain
[apple developer program]: https://developer.apple.com/programs/
[detox]: https://github.com/wix/Detox
[e2e readme]: ./e2e/README.md
[graphql code generator]: https://github.com/dotansimha/graphql-code-generator
[light node]: https://docs.celo.org/overview#ultralight-synchronization
[protocol readme]: ../protocol/README.md
[react native]: https://facebook.github.io/react-native/
[flipper]: https://fbflipper.com
[rn optimize example]: https://reactjs.org/docs/optimizing-performance.html#examples
[rn profiler]: https://reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html
[rn running on device]: https://facebook.github.io/react-native/docs/running-on-device
[setup]: ../../SETUP.md
[react-native-testing-library]: https://github.com/callstack/react-native-testing-library
[@testing-library/jest-native]: https://github.com/testing-library/jest-native#readme
[rntl-docs]: https://callstack.github.io/react-native-testing-library/docs/getting-started
[jest]: https://jestjs.io/docs/en/snapshot-testing
[redux-saga-test-plan]: https://github.com/jfairbank/redux-saga-test-plan
[sms retriever]: https://developers.google.com/identity/sms-retriever/verify#1_construct_a_verification_message
[android dev options]: https://developer.android.com/studio/debug/dev-options
[android ndk]: https://developer.android.com/studio/projects/install-ndk
[android studio]: https://developer.android.com/studio
[approve kernel extension]: https://developer.apple.com/library/content/technotes/tn2459/_index.html
[oracle being oracle]: https://github.com/Homebrew/homebrew-cask-versions/issues/7253
[device unauthorized]: https://stackoverflow.com/questions/23081263/adb-android-device-unauthorized
[watchman]: https://facebook.github.io/watchman/docs/install/
[jq]: https://stedolan.github.io/jq/
