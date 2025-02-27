import { render } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import { SendOrigin } from 'src/analytics/types'
import { AddressValidationType } from 'src/identity/reducer'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import ValidateRecipientAccount from 'src/send/ValidateRecipientAccount'
import { createMockStore, getMockStackScreenProps } from 'test/utils'
import { mockE164NumberInvite, mockTransactionData } from 'test/values'

describe('ValidateRecipientAccount', () => {
  it('renders correctly when full validation required', () => {
    const store = createMockStore()
    const tree = render(
      <Provider store={store}>
        <ValidateRecipientAccount
          {...getMockStackScreenProps(Screens.ValidateRecipientAccount, {
            transactionData: mockTransactionData,
            addressValidationType: AddressValidationType.FULL,
            origin: SendOrigin.AppSendFlow,
          })}
        />
      </Provider>
    )
    expect(tree).toMatchSnapshot()
  })

  it('renders correctly when partial validation required', () => {
    const store = createMockStore()
    const tree = render(
      <Provider store={store}>
        <ValidateRecipientAccount
          {...getMockStackScreenProps(Screens.ValidateRecipientAccount, {
            transactionData: mockTransactionData,
            addressValidationType: AddressValidationType.PARTIAL,
            origin: SendOrigin.AppSendFlow,
          })}
        />
      </Provider>
    )
    expect(tree).toMatchSnapshot()
  })

  it('navigates to send confirmation when validation successful for send flow', () => {
    const store = createMockStore({
      identity: {
        secureSendPhoneNumberMapping: {
          [mockE164NumberInvite]: {
            addressValidationType: AddressValidationType.NONE,
            validationSuccessful: false,
          },
        },
      },
    })

    const props = getMockStackScreenProps(Screens.ValidateRecipientAccount, {
      transactionData: mockTransactionData,
      addressValidationType: AddressValidationType.PARTIAL,
      origin: SendOrigin.AppSendFlow,
    })

    const tree = render(
      <Provider store={store}>
        <ValidateRecipientAccount {...props} />
      </Provider>
    )

    const updatedStore = createMockStore({
      identity: {
        secureSendPhoneNumberMapping: {
          [mockE164NumberInvite]: {
            addressValidationType: AddressValidationType.NONE,
            validationSuccessful: true,
          },
        },
      },
    })

    tree.rerender(
      <Provider store={updatedStore}>
        <ValidateRecipientAccount {...props} />
      </Provider>
    )

    expect(navigate).toHaveBeenCalledWith(Screens.SendConfirmation, {
      origin: SendOrigin.AppSendFlow,
      transactionData: mockTransactionData,
    })
  })
})

it('navigates to payment request confirmation when validation successful for request flow', () => {
  const store = createMockStore({
    identity: {
      secureSendPhoneNumberMapping: {
        [mockE164NumberInvite]: {
          addressValidationType: AddressValidationType.PARTIAL,
          validationSuccessful: false,
        },
      },
    },
  })

  const props = getMockStackScreenProps(Screens.ValidateRecipientAccount, {
    transactionData: mockTransactionData,
    addressValidationType: AddressValidationType.PARTIAL,
    isOutgoingPaymentRequest: true,
    origin: SendOrigin.AppRequestFlow,
  })

  const tree = render(
    <Provider store={store}>
      <ValidateRecipientAccount {...props} />
    </Provider>
  )

  const updatedStore = createMockStore({
    identity: {
      secureSendPhoneNumberMapping: {
        [mockE164NumberInvite]: {
          addressValidationType: AddressValidationType.NONE,
          validationSuccessful: true,
        },
      },
    },
  })

  tree.rerender(
    <Provider store={updatedStore}>
      <ValidateRecipientAccount {...props} />
    </Provider>
  )

  expect(navigate).toHaveBeenCalledWith(Screens.PaymentRequestConfirmation, {
    transactionData: mockTransactionData,
  })
})
