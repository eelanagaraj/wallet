import {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  VERIFICATION_PHONE_NUMBER,
} from 'react-native-dotenv'
import { dismissBanners } from '../utils/banners'
import { EXAMPLE_NAME, EXAMPLE_PHONE_NUMBER } from '../utils/consts'
import { checkBalance, receiveSms } from '../utils/twilio'
import { enterPinUi, setUrlDenyList, sleep, scrollIntoView } from '../utils/utils'

const jestExpect = require('expect')
const examplePhoneNumber = VERIFICATION_PHONE_NUMBER || EXAMPLE_PHONE_NUMBER

export default NewAccountPhoneVerification = () => {
  // Log Twilio balance at start
  beforeAll(async () => {
    try {
      await checkBalance()
    } catch {}
  })

  beforeEach(async () => {
    await device.launchApp({
      delete: true,
      permissions: { notifications: 'YES', contacts: 'YES' },
    })
    // Enable url deny list
    await setUrlDenyList()

    // Dismiss banners for firebase warning
    await dismissBanners()

    // Proceed through education screens
    for (let i = 0; i < 3; i++) {
      await element(by.id('Education/progressButton')).tap()
    }

    // Create new account
    await element(by.id('CreateAccountButton')).tap()

    // Accept terms
    await element(by.id('scrollView')).scrollTo('bottom')
    await expect(element(by.id('AcceptTermsButton'))).toBeVisible()
    await element(by.id('AcceptTermsButton')).tap()

    // Set name
    await element(by.id('NameEntry')).replaceText(EXAMPLE_NAME)
    await element(by.id('NameAndPictureContinueButton')).tap()

    // Set and verify pin
    await enterPinUi()
    await enterPinUi()

    // Set phone number
    await expect(element(by.id('PhoneNumberField'))).toBeVisible()
    await element(by.id('PhoneNumberField')).replaceText(examplePhoneNumber)
    await element(by.id('PhoneNumberField')).tapReturnKey()
  })

  // Uninstall after to remove verification
  afterAll(async () => {
    device.uninstallApp()
  })

  // Check that Twilio SID, Auth Token and Verification Phone Number are defined
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && VERIFICATION_PHONE_NUMBER) {
    // Conditionally skipping jest tests with an async request is currently not possible
    // https://github.com/facebook/jest/issues/7245
    // https://github.com/facebook/jest/issues/11489
    // Either fix or move to nightly tests when present
    // jest.retryTimes(1)
    it.skip('Then should be able to verify phone number', async () => {
      // Get Date at start
      let date = new Date()
      // Start verification
      await element(by.text('Start')).tap()

      // Retrieve the verification codes from Twilio
      const codes = await receiveSms(date)

      // Check that we've received 3 codes
      jestExpect(codes).toHaveLength(3)

      // Enter 3 codes
      for (let i = 0; i < 3; i++) {
        await sleep(1000)
        await waitFor(element(by.id(`VerificationCode${i}`)))
          .toBeVisible()
          .withTimeout(30 * 1000)
        await element(by.id(`VerificationCode${i}`)).typeText(codes[i])
      }

      // Assert we've arrived at the home screen
      await waitFor(element(by.id('SendOrRequestBar')))
        .toBeVisible()
        .withTimeout(45 * 1000)

      // Assert that correct phone number is present in sidebar
      await element(by.id('Hamburger')).tap()
      await expect(element(by.text(`${examplePhoneNumber}`))).toBeVisible()

      // Assert that 'Connect phone number' is not present in settings
      await scrollIntoView('Settings', 'SettingsScrollView')
      await waitFor(element(by.id('Settings')))
        .toBeVisible()
        .withTimeout(30000)
      await element(by.id('Settings')).tap()
      await expect(element(by.text('Connect phone number'))).not.toBeVisible()
    })

    // Note: (Tom) Skip this test until we have a nightly suite vs pull request suite as it takes a long time
    // jest.retryTimes(1)
    it.skip('Then should be able to resend last 2 messages', async () => {
      // Get Date at start
      let date = new Date()
      // Start verification
      await element(by.text('Start')).tap()

      // Request codes, but wait for all 3 to verify resend codes work
      const codes = await receiveSms(date)
      await waitFor(element(by.id('VerificationCode0')))
        .toExist()
        .withTimeout(45 * 1000)

      // Assert that we've received 3 codes
      jestExpect(codes).toHaveLength(3)

      // Input first code
      await element(by.id(`VerificationCode0`)).replaceText(codes[0])

      // Wait one minute before resending
      await sleep(60 * 1000)
      await element(by.text('Resend 2 messages')).tap()

      // Set date and enter pin to start resend
      date = new Date()
      await enterPinUi()
      let secondCodeSet = await receiveSms(date, 2, codes)

      // Assert that we've received at least 2 codes
      jestExpect(secondCodeSet.length).toBeGreaterThanOrEqual(2)

      // Input codes two codes
      for (let i = 0; i < 2; i++) {
        await waitFor(element(by.id(`VerificationCode${i + 1}`)))
          .toBeVisible()
          .withTimeout(10 * 1000)
        await element(by.id(`VerificationCode${i + 1}`)).replaceText(secondCodeSet[i])
      }

      // Assert we've arrived at the home screen
      await waitFor(element(by.id('SendOrRequestBar')))
        .toBeVisible()
        .withTimeout(30 * 1000)

      // Assert that correct phone number is present in sidebar
      await element(by.id('Hamburger')).tap()
      await expect(element(by.text(`${examplePhoneNumber}`))).toBeVisible()

      // Assert that 'Connect phone number' is not present in settings
      await scrollIntoView('Settings', 'SettingsScrollView')
      await waitFor(element(by.id('Settings')))
        .toBeVisible()
        .withTimeout(30 * 1000)
      await element(by.id('Settings')).tap()
      await expect(element(by.text('Connect phone number'))).not.toBeVisible()
    })
  }

  // TODO(tomm): use translations file instead of hardcoded strings
  // Assert correct content is visible on the phone verification screen
  jest.retryTimes(1)
  it('Then should have correct phone verification screen', async () => {
    await dismissBanners()
    await expect(element(by.text('Connect your phone number'))).toBeVisible()
    let skipAttributes = await element(by.text('Skip')).getAttributes()
    jestExpect(skipAttributes.enabled).toBe(true)
    await waitFor(element(by.text('Do I need to confirm?')))
      .toBeVisible()
      .withTimeout(10000)

    // Tap 'Do I need to confirm?' button
    await element(by.text('Do I need to confirm?')).tap()

    // Assert modal content is visible
    await waitFor(element(by.id('VerificationLearnMoreDialog')))
      .toBeVisible()
      .withTimeout(10 * 1000)
    // TODO(tomm): use translations file to grab expected text
    // await expect(element(by.text('Phone Numbers and Valora'))).toBeVisible()
    // await expect(
    //   element(
    //     by.text(
    //       'Confirming makes it easy to connect with your friends by allowing you to send and receive funds to your phone number.\n\nCan I do this later?\n\nYes, but unconfirmed accounts can only send payments with QR codes or Account Addresses.\n\nSecure and Private\n\nValora uses state of the art cryptography to keep your phone number private.'
    //     )
    //   )
    // ).toBeVisible()

    // Assert able to dismiss modal and skip
    await element(by.text('Dismiss')).tap()
    await element(by.text('Skip')).tap()

    // Assert VerificationSkipDialog modal visible
    await waitFor(element(by.id('VerificationSkipDialog')))
      .toBeVisible()
      .withTimeout(10 * 1000)
    // await expect(element(by.text('Are you sure?'))).toBeVisible()
    // await expect(
    //   element(
    //     by.text(
    //       'Confirming allows you to send and receive funds easily to your phone number.\n\nUnconfirmed accounts can only send payments using Celo addresses or QR codes.'
    //     )
    //   )
    // ).toBeVisible()

    // Assert Back button is enabled
    let goBackButtonAttributes = await element(by.text('Go Back')).getAttributes()
    jestExpect(goBackButtonAttributes.enabled).toBe(true)

    // Tap 'Skip for now'
    await element(by.text('Skip for now')).tap()

    // Assert we've arrived at the home screen
    await waitFor(element(by.id('SendOrRequestBar')))
      .toBeVisible()
      .withTimeout(10 * 1000)

    // Assert that 'Connect phone number' is present in settings
    await element(by.id('Hamburger')).tap()
    await scrollIntoView('Settings', 'SettingsScrollView')
    await waitFor(element(by.id('Settings')))
      .toBeVisible()
      .withTimeout(30000)
    await element(by.id('Settings')).tap()
    await waitFor(element(by.text('Connect phone number')))
      .toBeVisible()
      .withTimeout(10 * 1000)
  })
}
