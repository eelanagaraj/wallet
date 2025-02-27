/**
 * Sagas and utils for handling DEK related tasks
 * Ideally all this code and the DEK state and logic would be moved out of the web3 dir
 * but keeping it here for now since that's where other account state is
 */

import { Result } from '@celo/base'
import { CeloTransactionObject, CeloTxReceipt } from '@celo/connect'
import { ContractKit } from '@celo/contractkit/lib/kit'
import { AccountsWrapper } from '@celo/contractkit/lib/wrappers/Accounts'
import { MetaTransactionWalletWrapper } from '@celo/contractkit/lib/wrappers/MetaTransactionWallet'
import { OdisUtils } from '@celo/identity'
import { AuthSigner } from '@celo/identity/lib/odis/query'
import {
  ensureLeading0x,
  eqAddress,
  hexToBuffer,
  normalizeAddressWith0x,
} from '@celo/utils/lib/address'
import { compressedPubKey, deriveDek } from '@celo/utils/lib/dataEncryptionKey'
import { FetchError, TxError } from '@komenci/kit/lib/errors'
import { KomenciKit } from '@komenci/kit/lib/kit'
import * as bip39 from 'react-native-bip39'
import { call, put, select } from 'redux-saga/effects'
import { checkIfProfileUploaded } from 'src/account/profileInfo'
import { OnboardingEvents } from 'src/analytics/Events'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { features } from 'src/flags'
import { celoTokenBalanceSelector } from 'src/goldToken/selectors'
import {
  FetchDataEncryptionKeyAction,
  updateAddressDekMap,
  updateWalletToAccountAddress,
} from 'src/identity/actions'
import { WalletToAccountAddressType } from 'src/identity/reducer'
import { walletToAccountAddressSelector } from 'src/identity/selectors'
import { cUsdBalanceSelector } from 'src/stableToken/selectors'
import { getCurrencyAddress } from 'src/tokens/saga'
import { sendTransaction } from 'src/transactions/send'
import { newTransactionContext } from 'src/transactions/types'
import { Currency } from 'src/utils/currencies'
import Logger from 'src/utils/Logger'
import { registerDataEncryptionKey, setDataEncryptionKey } from 'src/web3/actions'
import { getContractKit, getContractKitAsync } from 'src/web3/contracts'
import { getAccount, getAccountAddress, getConnectedUnlockedAccount } from 'src/web3/saga'
import {
  dataEncryptionKeySelector,
  isDekRegisteredSelector,
  mtwAddressSelector,
} from 'src/web3/selectors'
import { estimateGas } from 'src/web3/utils'
import { ec as EC } from 'elliptic'

const ec = new EC('secp256k1')

const TAG = 'web3/dataEncryptionKey'
const PLACEHOLDER_DEK = '0x02c9cacca8c5c5ebb24dc6080a933f6d52a072136a069083438293d71da36049dc'

// Based on https://github.com/celo-org/celo-monorepo/blob/f4dd249e9cef6a541b909c3dc7ae01888b088de2/packages/sdk/identity/src/odis/query.ts#L111
export function signWithDEK({
  message,
  dataEncryptionKey,
}: {
  message: string
  dataEncryptionKey: string
}) {
  const key = ec.keyFromPrivate(hexToBuffer(dataEncryptionKey))
  return JSON.stringify(key.sign(message).toDER())
}

export function* fetchDataEncryptionKeyWrapper({ address }: FetchDataEncryptionKeyAction) {
  yield call(doFetchDataEncryptionKey, address)
}

export function* doFetchDataEncryptionKey(walletAddress: string) {
  // TODO consider caching here
  // We could use the values in the DekMap instead of looking up each time
  // But Deks can change, how should we invalidate the cache?

  const contractKit = yield call(getContractKit)
  const accountsWrapper: AccountsWrapper = yield call([
    contractKit.contracts,
    contractKit.contracts.getAccounts,
  ])
  const walletToAccountAddress: WalletToAccountAddressType = yield select(
    walletToAccountAddressSelector
  )
  const accountAddress =
    walletToAccountAddress[normalizeAddressWith0x(walletAddress)] ?? walletAddress
  const dek: string = yield call(accountsWrapper.getDataEncryptionKey, accountAddress)
  yield put(updateAddressDekMap(accountAddress, dek || null))
  return !dek ? null : hexToBuffer(dek)
}

export function* createAccountDek(mnemonic: string) {
  if (!mnemonic) {
    throw new Error('Cannot generate DEK with empty mnemonic')
  }
  const { privateKey } = yield call(deriveDek, mnemonic, bip39)
  const newDek = ensureLeading0x(privateKey)
  yield put(setDataEncryptionKey(newDek))
  return newDek
}

function* sendUserFundedSetAccountTx(
  contractKit: ContractKit,
  accountsWrapper: AccountsWrapper,
  publicDataKey: string,
  accountAddress: string,
  walletAddress: string
) {
  const mtwAddressCreated: boolean = !!(yield select(mtwAddressSelector))
  // Generate and send a transaction to set the DEK on-chain.
  let setAccountTx = accountsWrapper.setAccount('', publicDataKey, walletAddress)
  const context = newTransactionContext(TAG, 'Set wallet address & DEK')
  // If MTW has been created, route the user's DEK/wallet registration through it
  // because accountAddress is determined by msg.sender. Else, do it normally
  if (mtwAddressCreated) {
    const mtwWrapper: MetaTransactionWalletWrapper = yield call(
      [contractKit.contracts, contractKit.contracts.getMetaTransactionWallet],
      accountAddress
    )

    const proofOfPossession: {
      v: number
      r: string
      s: string
    } = yield call(
      [accountsWrapper, accountsWrapper.generateProofOfKeyPossession],
      accountAddress,
      walletAddress
    )

    setAccountTx = accountsWrapper.setAccount('', publicDataKey, walletAddress, proofOfPossession)

    const setAccountTxViaMTW: CeloTransactionObject<string> = yield call(
      [mtwWrapper, mtwWrapper.signAndExecuteMetaTransaction],
      setAccountTx.txo
    )
    yield call(sendTransaction, setAccountTxViaMTW.txo, walletAddress, context)
  } else {
    yield call(sendTransaction, setAccountTx.txo, walletAddress, context)
  }
  yield put(updateWalletToAccountAddress({ [walletAddress]: accountAddress }))
}

// Register the address and DEK with the Accounts contract
// A no-op if registration has already been done
// pendingMtwAddress is only passed during feeless verification flow
export function* registerAccountDek() {
  try {
    const isAlreadyRegistered = yield select(isDekRegisteredSelector)
    if (isAlreadyRegistered) {
      Logger.debug(
        `${TAG}@registerAccountDek`,
        'Skipping DEK registration because its already registered'
      )
      yield call(checkIfProfileUploaded)
      return
    }

    const stableBalance = yield select(cUsdBalanceSelector)
    const celoBalance = yield select(celoTokenBalanceSelector)
    if (
      (stableBalance === null || stableBalance === '0') &&
      (celoBalance === null || celoBalance === '0')
    ) {
      Logger.debug(
        `${TAG}@registerAccountDek`,
        'Skipping DEK registration because there are no funds'
      )
      return
    }

    ValoraAnalytics.track(OnboardingEvents.account_dek_register_start)
    Logger.debug(
      `${TAG}@registerAccountDek`,
      'Setting wallet address and public data encryption key'
    )

    const privateDataKey: string | null = yield select(dataEncryptionKeySelector)
    if (!privateDataKey) {
      throw new Error('No data key in store. Should never happen.')
    }

    const publicDataKey = compressedPubKey(hexToBuffer(privateDataKey))

    const contractKit = yield call(getContractKit)
    const accountsWrapper: AccountsWrapper = yield call([
      contractKit.contracts,
      contractKit.contracts.getAccounts,
    ])

    const accountAddress: string = yield call(getAccountAddress)
    const walletAddress: string = yield call(getAccount)

    const upToDate: boolean = yield call(
      isAccountUpToDate,
      accountsWrapper,
      accountAddress,
      walletAddress,
      publicDataKey
    )
    ValoraAnalytics.track(OnboardingEvents.account_dek_register_account_checked)

    if (upToDate) {
      Logger.debug(`${TAG}@registerAccountDek`, 'Address and DEK up to date, skipping.')
      yield put(registerDataEncryptionKey())
      ValoraAnalytics.track(OnboardingEvents.account_dek_register_complete, {
        newRegistration: false,
      })
      return
    }

    yield call(getConnectedUnlockedAccount)
    ValoraAnalytics.track(OnboardingEvents.account_dek_register_account_unlocked)

    yield call(
      sendUserFundedSetAccountTx,
      contractKit,
      accountsWrapper,
      publicDataKey,
      accountAddress,
      walletAddress
    )

    // TODO: Make sure this action is also triggered after the DEK registration
    // that will happen via Komenci
    yield put(registerDataEncryptionKey())
    ValoraAnalytics.track(OnboardingEvents.account_dek_register_complete, {
      newRegistration: true,
    })
    yield call(checkIfProfileUploaded)
  } catch (error) {
    // DEK registration failures are not considered fatal. Swallow the error and allow calling saga to proceed.
    // Registration will be re-attempted on next payment send
    Logger.error(`${TAG}@registerAccountDek`, 'Failure registering DEK', error)
  }
}

// Unlike normal DEK registration, registration via Komenci should be considered fatal. If there
// is no on-chain mapping of accountAddresss => walletAddress, then senders will erroneously
// send to MTW instead of EOA. A no-op if registration has already been done
export function* registerWalletAndDekViaKomenci(
  komenciKit: KomenciKit,
  accountAddress: string,
  walletAddress: string
) {
  ValoraAnalytics.track(OnboardingEvents.account_dek_register_start, { feeless: true })

  Logger.debug(
    `${TAG}@registerAccountDekViaKomenci`,
    'Setting wallet address and public data encryption key'
  )

  yield call(getConnectedUnlockedAccount)
  ValoraAnalytics.track(OnboardingEvents.account_dek_register_account_unlocked, { feeless: true })

  const privateDataKey: string | null = yield select(dataEncryptionKeySelector)
  if (!privateDataKey) {
    throw new Error('No data key in store. Should never happen.')
  }

  const publicDataKey = compressedPubKey(hexToBuffer(privateDataKey))

  const contractKit = yield call(getContractKit)
  const accountsWrapper: AccountsWrapper = yield call([
    contractKit.contracts,
    contractKit.contracts.getAccounts,
  ])

  const upToDate: boolean = yield call(
    isAccountUpToDate,
    accountsWrapper,
    accountAddress,
    walletAddress,
    publicDataKey
  )
  ValoraAnalytics.track(OnboardingEvents.account_dek_register_account_checked, { feeless: true })

  if (upToDate) {
    Logger.debug(`${TAG}@registerAccountDekViaKomenci`, 'Address and DEK up to date, skipping.')
    yield put(registerDataEncryptionKey())
    ValoraAnalytics.track(OnboardingEvents.account_dek_register_complete, {
      newRegistration: false,
      feeless: true,
    })
    return
  }

  const accountName = ''

  Logger.debug(
    TAG,
    '@registerAccountDekViaKomenci Passed params:',
    accountAddress,
    walletAddress,
    publicDataKey
  )

  const setAccountResult: Result<CeloTxReceipt, FetchError | TxError> = yield call(
    [komenciKit, komenciKit.setAccount],
    accountAddress,
    accountName,
    publicDataKey,
    walletAddress
  )

  if (!setAccountResult.ok) {
    Logger.debug(TAG, '@registerAccountDekViaKomenci Error:', setAccountResult.error.message)
    throw setAccountResult.error
  }

  yield put(updateWalletToAccountAddress({ [walletAddress.toLowerCase()]: accountAddress }))
  yield put(registerDataEncryptionKey())
  ValoraAnalytics.track(OnboardingEvents.account_dek_register_complete, {
    newRegistration: true,
    feeless: true,
  })

  yield call(checkIfProfileUploaded)
}

// Check if account address and DEK match what's in
// the Accounts contract
export async function isAccountUpToDate(
  accountsWrapper: AccountsWrapper,
  accountAddress: string,
  walletAddress: string,
  dataKey: string
) {
  if (!accountAddress || !dataKey) {
    return false
  }

  const [onchainWalletAddress, onchainDEK] = await Promise.all([
    accountsWrapper.getWalletAddress(accountAddress),
    accountsWrapper.getDataEncryptionKey(accountAddress),
  ])
  Logger.debug(`${TAG}/isAccountUpToDate`, `DEK associated with account ${onchainDEK}`)
  return (
    onchainWalletAddress &&
    onchainDEK &&
    eqAddress(onchainWalletAddress, walletAddress) &&
    eqAddress(onchainDEK, dataKey)
  )
}

export async function getRegisterDekTxGas(account: string, currency: Currency) {
  try {
    Logger.debug(`${TAG}/getRegisterDekTxGas`, 'Getting gas estimate for tx')
    const contractKit = await getContractKitAsync()
    const Accounts = await contractKit.contracts.getAccounts()
    const tx = Accounts.setAccount('', PLACEHOLDER_DEK, account)
    const txParams = { from: account, feeCurrency: await getCurrencyAddress(currency) }
    const gas = await estimateGas(tx.txo, txParams)
    Logger.debug(`${TAG}/getRegisterDekTxGas`, `Estimated gas of ${gas.toString()}`)
    return gas
  } catch (error) {
    Logger.warn(`${TAG}/getRegisterDekTxGas`, 'Failed to estimate DEK tx gas', error)
    throw Error(ErrorMessages.INSUFFICIENT_BALANCE)
  }
}

export function* getAuthSignerForAccount(accountAddress: string, walletAddress: string) {
  const contractKit = yield call(getContractKit)

  if (features.PNP_USE_DEK_FOR_AUTH) {
    // Use the DEK for authentication if the current DEK is registered with this account
    const accountsWrapper: AccountsWrapper = yield call([
      contractKit.contracts,
      contractKit.contracts.getAccounts,
    ])
    const privateDataKey: string | null = yield select(dataEncryptionKeySelector)
    if (!privateDataKey) {
      Logger.error(TAG + '/getAuthSignerForAccount', 'Missing comment key, should never happen.')
    } else {
      const publicDataKey = compressedPubKey(hexToBuffer(privateDataKey))
      const upToDate: boolean = yield call(
        isAccountUpToDate,
        accountsWrapper,
        accountAddress,
        walletAddress,
        publicDataKey
      )
      if (!upToDate) {
        Logger.error(TAG + '/getAuthSignerForAccount', `DEK mismatch.`)
      } else {
        Logger.info(TAG + '/getAuthSignerForAccount', 'Using DEK for authentication')
        const encyptionKeySigner: AuthSigner = {
          authenticationMethod: OdisUtils.Query.AuthenticationMethod.ENCRYPTION_KEY,
          rawKey: privateDataKey,
        }
        return encyptionKeySigner
      }
    }
  }

  // Fallback to using wallet key
  Logger.info(TAG + '/getAuthSignerForAccount', 'Using wallet key for authentication')
  const walletKeySigner: AuthSigner = {
    authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
    contractKit,
  }
  return walletKeySigner
}
