import ReviewFrame from '@celo/react-components/components/ReviewFrame'
import TextButton from '@celo/react-components/components/TextButton'
import Touchable from '@celo/react-components/components/Touchable'
import colors from '@celo/react-components/styles/colors'
import fontStyles from '@celo/react-components/styles/fonts'
import { iconHitslop } from '@celo/react-components/styles/variables'
import { StackScreenProps } from '@react-navigation/stack'
import BigNumber from 'bignumber.js'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import { showError } from 'src/alert/actions'
import { FeeEvents, SendEvents } from 'src/analytics/Events'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import { TokenTransactionType } from 'src/apollo/types'
import { ErrorMessages } from 'src/app/ErrorMessages'
import CommentTextInput from 'src/components/CommentTextInput'
import ContactCircle from 'src/components/ContactCircle'
import CurrencyDisplay from 'src/components/CurrencyDisplay'
import Dialog from 'src/components/Dialog'
import FeeDrawer from 'src/components/FeeDrawer'
import HeaderWithBackButton from 'src/components/header/HeaderWithBackButton'
import ShortenedAddress from 'src/components/ShortenedAddress'
import TokenBottomSheetLegacy, { TokenPickerOrigin } from 'src/components/TokenBottomSheetLegacy'
import TotalLineItem from 'src/components/TotalLineItem'
import CalculateFee, {
  CalculateFeeChildren,
  PropsWithoutChildren as CalculateFeeProps,
} from 'src/fees/CalculateFee'
import { FeeType } from 'src/fees/reducer'
import { FeeInfo } from 'src/fees/saga'
import { getFeeInTokens } from 'src/fees/selectors'
import InfoIcon from 'src/icons/InfoIcon'
import { fetchDataEncryptionKey } from 'src/identity/actions'
import { getAddressValidationType, getSecureSendAddress } from 'src/identity/secureSend'
import {
  addressToDataEncryptionKeySelector,
  e164NumberToAddressSelector,
  secureSendPhoneNumberMappingSelector,
} from 'src/identity/selectors'
import InviteAndSendModal from 'src/invite/InviteAndSendModal'
import { LocalCurrencyCode } from 'src/localCurrency/consts'
import { convertCurrencyToLocalAmount } from 'src/localCurrency/convert'
import {
  convertBetweenCurrencies,
  useCurrencyToLocalAmountExchangeRate,
} from 'src/localCurrency/hooks'
import {
  getLocalCurrencyCode,
  localCurrencyExchangeRatesSelector,
} from 'src/localCurrency/selectors'
import { noHeader } from 'src/navigator/Headers'
import { navigate } from 'src/navigator/NavigationService'
import { modalScreenOptions } from 'src/navigator/Navigator'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { getDisplayName } from 'src/recipients/recipient'
import { isAppConnected } from 'src/redux/selectors'
import { sendPaymentOrInviteLegacy } from 'src/send/actions'
import { isSendingSelector } from 'src/send/selectors'
import { getConfirmationInput } from 'src/send/utils'
import DisconnectBanner from 'src/shared/DisconnectBanner'
import { fetchStableBalances } from 'src/stableToken/actions'
import { useBalance } from 'src/stableToken/hooks'
import { Currency } from 'src/utils/currencies'
import Logger from 'src/utils/Logger'
import { currentAccountSelector, isDekRegisteredSelector } from 'src/web3/selectors'

export interface CurrencyInfo {
  localCurrencyCode: LocalCurrencyCode
  localExchangeRate: string | null
}

type OwnProps = StackScreenProps<
  StackParamList,
  Screens.SendConfirmationLegacy | Screens.SendConfirmationLegacyModal
>
type Props = OwnProps

export const sendConfirmationLegacyScreenNavOptions = (navOptions: Props) =>
  navOptions.route.name === Screens.SendConfirmationLegacyModal
    ? {
        ...noHeader,
        ...modalScreenOptions(navOptions),
      }
    : noHeader

function SendConfirmationLegacy(props: Props) {
  const [modalVisible, setModalVisible] = useState(false)
  const [encryptionDialogVisible, setEncryptionDialogVisible] = useState(false)
  const [comment, setComment] = useState('')
  const [feeInfo, setFeeInfo] = useState(undefined as FeeInfo | undefined)
  const [showingTokenChooser, showTokenChooser] = useState(false)

  const dispatch = useDispatch()
  const { t } = useTranslation()

  const fromModal = props.route.name === Screens.SendConfirmationLegacyModal
  const { transactionData, addressJustValidated, currencyInfo, origin } = props.route.params
  const e164NumberToAddress = useSelector(e164NumberToAddressSelector)
  const secureSendPhoneNumberMapping = useSelector(secureSendPhoneNumberMappingSelector)
  const confirmationInput = getConfirmationInput(
    transactionData,
    e164NumberToAddress,
    secureSendPhoneNumberMapping
  )
  const {
    type,
    amount: originalAmount,
    currency: originalCurrency,
    recipient,
    recipientAddress,
    firebasePendingRequestUid,
    reason,
  } = confirmationInput

  const [amount, setAmount] = useState(originalAmount)
  const [currency, setCurrency] = useState(originalCurrency)

  const addressValidationType = getAddressValidationType(
    transactionData.recipient,
    secureSendPhoneNumberMapping
  )
  // Undefined or null means no addresses ever validated through secure send
  const validatedRecipientAddress = getSecureSendAddress(
    transactionData.recipient,
    secureSendPhoneNumberMapping
  )
  const account = useSelector(currentAccountSelector)
  const isSending = useSelector(isSendingSelector)
  // Only load the balance once to prevent race conditions with transactions updating balance
  const [balance] = useState(useBalance(currency))
  const celoBalance = useBalance(Currency.Celo)
  const appConnected = useSelector(isAppConnected)
  const isDekRegistered = useSelector(isDekRegisteredSelector) ?? false
  const addressToDataEncryptionKey = useSelector(addressToDataEncryptionKeySelector)
  const exchangeRates = useSelector(localCurrencyExchangeRatesSelector)

  let newCurrencyInfo: CurrencyInfo = {
    localCurrencyCode: useSelector(getLocalCurrencyCode),
    localExchangeRate: useCurrencyToLocalAmountExchangeRate(currency),
  }
  if (currencyInfo) {
    newCurrencyInfo = currencyInfo
  }

  useEffect(() => {
    dispatch(fetchStableBalances())
    if (addressJustValidated) {
      Logger.showMessage(t('addressConfirmed'))
    }
    triggerFetchDataEncryptionKey()
  }, [])

  const triggerFetchDataEncryptionKey = () => {
    const address = confirmationInput.recipientAddress
    if (address) {
      dispatch(fetchDataEncryptionKey(address))
    }
  }

  const onCloseTokenPicker = () => showTokenChooser(false)
  const onTokenChosen = (newCurrency: Currency) => {
    showTokenChooser(false)
    const newAmount = convertBetweenCurrencies(amount, currency, newCurrency, exchangeRates)
    if (newAmount) {
      setAmount(newAmount)
      setCurrency(newCurrency)
    } else {
      dispatch(showError(ErrorMessages.FETCH_FAILED))
    }
  }

  const onSendClick = () => {
    if (type === TokenTransactionType.InviteSent) {
      setModalVisible(true)
    } else {
      sendOrInvite()
    }
  }

  const sendOrInvite = () => {
    const finalComment =
      type === TokenTransactionType.PayRequest || type === TokenTransactionType.PayPrefill
        ? reason || ''
        : comment

    const localCurrencyAmount = convertCurrencyToLocalAmount(
      amount,
      newCurrencyInfo.localExchangeRate
    )

    ValoraAnalytics.track(SendEvents.send_confirm_send, {
      origin,
      isScan: !!props.route.params?.isFromScan,
      isInvite: !recipientAddress,
      isRequest: type === TokenTransactionType.PayRequest,
      localCurrencyExchangeRate: newCurrencyInfo.localExchangeRate,
      localCurrency: newCurrencyInfo.localCurrencyCode,
      dollarAmount: amount.toString(),
      localCurrencyAmount: localCurrencyAmount?.toString() ?? null,
      commentLength: finalComment.length,
    })

    dispatch(
      sendPaymentOrInviteLegacy(
        amount,
        currency,
        finalComment,
        recipient,
        recipientAddress,
        feeInfo,
        firebasePendingRequestUid,
        fromModal
      )
    )
  }

  const onEditAddressClick = () => {
    ValoraAnalytics.track(SendEvents.send_secure_edit)
    navigate(Screens.ValidateRecipientIntro, {
      transactionData,
      addressValidationType,
      origin: props.route.params.origin,
    })
  }

  const cancelModal = () => {
    setModalVisible(false)
  }

  const sendInvite = () => {
    setModalVisible(false)
    sendOrInvite()
  }

  const onBlur = () => {
    const trimmedComment = comment.trim()
    setComment(trimmedComment)
  }

  const onShowEncryptionModal = () => {
    setEncryptionDialogVisible(true)
  }

  const onDismissEncryptionModal = () => {
    setEncryptionDialogVisible(false)
  }

  const renderWithAsyncFee: CalculateFeeChildren = (asyncFee) => {
    if (!balance) {
      // Should never happen. This check is made in previous screens.
      dispatch(showError(ErrorMessages.FETCH_FAILED))
      navigate(Screens.WalletHome)
      return null
    }
    const fee = getFeeInTokens(asyncFee.result?.fee)

    // Check if the fee info has been updated and set it in the component state for use in sending.
    const feeInfoUpdated = feeInfo?.fee !== asyncFee.result?.fee
    if (asyncFee.result) {
      setFeeInfo(asyncFee.result)
    }

    // TODO(victor): If CELO is used to pay fees, it cannot be added to the cUSD ammount. We should
    // fix this at some point, but because only cUSD is used for fees right now, it is not an issue.
    const amountWithFee =
      asyncFee.result?.currency !== Currency.Celo ? amount.plus(fee ?? 0) : amount
    const userHasEnough =
      !asyncFee.loading &&
      amountWithFee.isLessThanOrEqualTo(balance) &&
      (asyncFee.result?.currency !== Currency.Celo ||
        !fee ||
        fee?.isLessThanOrEqualTo(celoBalance ?? new BigNumber(0)))
    const isPrimaryButtonDisabled = isSending || !userHasEnough || !appConnected || !!asyncFee.error

    const isInvite = type === TokenTransactionType.InviteSent

    const subtotalAmount = {
      value: amount,
      currencyCode: currency,
    }

    let primaryBtnInfo
    if (type === TokenTransactionType.PayRequest || type === TokenTransactionType.PayPrefill) {
      primaryBtnInfo = {
        action: sendOrInvite,
        text: t('pay'),
        disabled: isPrimaryButtonDisabled,
      }
    } else {
      primaryBtnInfo = {
        action: onSendClick,
        text: isInvite ? t('sendAndInvite') : t('send'),
        disabled: isPrimaryButtonDisabled,
      }
    }

    const paymentComment = reason || ''

    const FeeContainer = () => {
      let securityFee
      let dekFee
      if (!isDekRegistered && fee) {
        // 'fee' contains cost for both DEK registration and
        // send payment so we adjust it here
        securityFee = fee.dividedBy(2)
        dekFee = fee.dividedBy(2)
      }

      if (feeInfoUpdated) {
        ValoraAnalytics.track(FeeEvents.fee_rendered, {
          feeType: 'Security',
          fee: securityFee?.toString(),
        })
      }
      const totalAmount = {
        value: amountWithFee,
        currencyCode: currency,
      }

      const onEditCurrency = () => {
        showTokenChooser(true)
      }

      return (
        <View style={styles.feeContainer}>
          <FeeDrawer
            testID={'feeDrawer/SendConfirmation'}
            isEstimate={true}
            currency={asyncFee.result?.currency}
            securityFee={securityFee}
            showDekfee={!isDekRegistered}
            dekFee={dekFee}
            feeLoading={asyncFee.loading}
            feeHasError={!!asyncFee.error}
            totalFee={fee}
            currencyInfo={newCurrencyInfo}
          />
          <TotalLineItem
            amount={totalAmount}
            currencyInfo={newCurrencyInfo}
            canEditCurrency={
              type === TokenTransactionType.PayRequest && !!firebasePendingRequestUid
            }
            onEditCurrency={onEditCurrency}
          />
        </View>
      )
    }

    const EncryptionWarningLabel = () => {
      const showLabel = !recipientAddress || addressToDataEncryptionKey[recipientAddress] === null

      return showLabel ? (
        <View style={styles.encryptionWarningLabelContainer}>
          <Text style={styles.encryptionWarningLabel}>{t('encryption.warningLabel')}</Text>
          <Touchable onPress={onShowEncryptionModal} borderless={true} hitSlop={iconHitslop}>
            <InfoIcon color={colors.informational} size={14} />
          </Touchable>
        </View>
      ) : null
    }

    return (
      <SafeAreaView
        style={styles.container}
        edges={props.route.name === Screens.SendConfirmationLegacyModal ? ['bottom'] : undefined}
      >
        <HeaderWithBackButton eventName={SendEvents.send_confirm_back} />
        <DisconnectBanner />
        <ReviewFrame
          FooterComponent={FeeContainer}
          LabelAboveKeyboard={EncryptionWarningLabel}
          confirmButton={primaryBtnInfo}
          isSending={isSending}
        >
          <View style={styles.transferContainer}>
            {isInvite && <Text style={styles.inviteText}>{t('inviteMoneyEscrow')}</Text>}
            <View style={styles.headerContainer}>
              <ContactCircle recipient={recipient} />
              <View style={styles.recipientInfoContainer}>
                <Text style={styles.headerText} testID="HeaderText">
                  {t('sending')}
                </Text>
                <Text style={styles.displayName}>{getDisplayName(recipient, t)}</Text>
                {validatedRecipientAddress && (
                  <View style={styles.editContainer}>
                    <ShortenedAddress style={styles.address} address={validatedRecipientAddress} />
                    <TextButton
                      style={styles.editButton}
                      testID={'accountEditButton'}
                      onPress={onEditAddressClick}
                    >
                      {t('edit')}
                    </TextButton>
                  </View>
                )}
              </View>
            </View>
            <CurrencyDisplay
              style={styles.amount}
              amount={subtotalAmount}
              currencyInfo={newCurrencyInfo}
            />
            {type === TokenTransactionType.PayRequest ||
            type === TokenTransactionType.PayPrefill ? (
              <View>
                <Text style={styles.paymentComment}>{paymentComment}</Text>
              </View>
            ) : (
              <CommentTextInput
                testID={'send'}
                onCommentChange={setComment}
                comment={comment}
                onBlur={onBlur}
              />
            )}
          </View>
          <InviteAndSendModal
            isVisible={modalVisible}
            name={getDisplayName(transactionData.recipient, t)}
            onInvite={sendInvite}
            onCancel={cancelModal}
          />
          {/** Encryption warning dialog */}
          <Dialog
            title={t('encryption.warningModalHeader')}
            isVisible={encryptionDialogVisible}
            actionText={t('dismiss')}
            actionPress={onDismissEncryptionModal}
          >
            {t('encryption.warningModalBody')}
          </Dialog>
        </ReviewFrame>
        <TokenBottomSheetLegacy
          isVisible={showingTokenChooser}
          origin={TokenPickerOrigin.SendConfirmation}
          onCurrencySelected={onTokenChosen}
          onClose={onCloseTokenPicker}
        />
      </SafeAreaView>
    )
  }

  if (!account || !balance) {
    throw Error('Account is required')
  }
  const feeProps: CalculateFeeProps = recipientAddress
    ? {
        feeType: FeeType.SEND,
        account,
        recipientAddress,
        amount: amount.valueOf(),
        currency,
        balance: balance.toString(),
        includeDekFee: !isDekRegistered,
      }
    : { feeType: FeeType.INVITE, account, amount, currency, balance: balance.toString() }

  return (
    // Note: intentionally passing a new child func here otherwise
    // it doesn't re-render on state change since CalculateFee is a pure component
    <CalculateFee {...feeProps}>{(asyncFee) => renderWithAsyncFee(asyncFee)}</CalculateFee>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  feeContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  inviteText: {
    ...fontStyles.small,
    color: colors.gray4,
    paddingBottom: 24,
  },
  transferContainer: {
    alignItems: 'flex-start',
    paddingBottom: 24,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recipientInfoContainer: {
    paddingLeft: 8,
  },
  headerText: {
    ...fontStyles.regular,
    color: colors.gray4,
  },
  displayName: {
    ...fontStyles.regular500,
  },
  editContainer: {
    flexDirection: 'row',
  },
  address: {
    ...fontStyles.small,
    color: colors.gray5,
    paddingRight: 4,
  },
  editButton: {
    ...fontStyles.small,
    color: colors.gray5,
    textDecorationLine: 'underline',
  },
  amount: {
    paddingVertical: 8,
    ...fontStyles.largeNumber,
  },
  paymentComment: {
    ...fontStyles.large,
    color: colors.gray5,
  },
  encryptionWarningLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  encryptionWarningLabel: {
    ...fontStyles.regular,
    color: colors.informational,
    paddingRight: 8,
  },
})

export default SendConfirmationLegacy
