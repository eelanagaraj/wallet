import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import 'react-native'
import { Provider } from 'react-redux'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import RegulatoryTerms, {
  RegulatoryTerms as RegulatoryTermsClass,
} from 'src/onboarding/registration/RegulatoryTerms'
import { createMockStore, getMockI18nProps } from 'test/utils'

jest.mock('src/navigator/NavigationService', () => {
  return { navigate: jest.fn() }
})

describe('RegulatoryTermsScreen', () => {
  it('renders correctly', () => {
    const store = createMockStore()
    const tree = render(
      <Provider store={store}>
        <RegulatoryTerms />
      </Provider>
    )
    expect(tree).toMatchSnapshot()
  })

  describe('when accept button is pressed', () => {
    it('stores that info', async () => {
      const store = createMockStore({})
      const acceptTerms = jest.fn()
      const wrapper = render(
        <Provider store={store}>
          <RegulatoryTermsClass {...getMockI18nProps()} acceptTerms={acceptTerms} />
        </Provider>
      )
      fireEvent.press(wrapper.getByTestId('AcceptTermsButton'))
      expect(acceptTerms).toHaveBeenCalled()
    })
    it('navigates to NameAndPicture', () => {
      const store = createMockStore({})
      const acceptTerms = jest.fn()
      const wrapper = render(
        <Provider store={store}>
          <RegulatoryTermsClass {...getMockI18nProps()} acceptTerms={acceptTerms} />
        </Provider>
      )
      fireEvent.press(wrapper.getByTestId('AcceptTermsButton'))
      expect(navigate).toHaveBeenCalledWith(Screens.NameAndPicture)
    })
  })
})
