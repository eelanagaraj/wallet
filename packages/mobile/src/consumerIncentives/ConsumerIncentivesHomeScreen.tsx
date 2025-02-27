import Button, { BtnSizes } from '@celo/react-components/components/Button'
import Touchable from '@celo/react-components/components/Touchable'
import Times from '@celo/react-components/icons/Times'
import colors from '@celo/react-components/styles/colors'
import fontStyles from '@celo/react-components/styles/fonts'
import variables from '@celo/react-components/styles/variables'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { RewardsEvents } from 'src/analytics/Events'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import { CELO_REWARDS_T_AND_C } from 'src/brandingConfig'
import { RewardsScreenCta } from 'src/consumerIncentives/analyticsEventsTracker'
import { boostRewards, earn1, earn2, earn3 } from 'src/images/Images'
import { noHeader } from 'src/navigator/Headers'
import { navigate, navigateBack } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import useSelector from 'src/redux/useSelector'
import { useCountryFeatures } from 'src/utils/countryFeatures'
import { Currency } from 'src/utils/currencies'

type Props = StackScreenProps<StackParamList, Screens.ConsumerIncentivesHomeScreen>
export default function ConsumerIncentivesHomeScreen(props: Props) {
  const { t } = useTranslation()
  const userIsVerified = useSelector((state) => state.app.numberVerified)
  const insets = useSafeAreaInsets()

  const { rewardsPercent, rewardsMax: maxBalance, rewardsMin: minBalance } = useSelector(
    (state) => state.app
  )

  const { USE_CEUR } = useCountryFeatures()
  const currency = USE_CEUR ? Currency.Euro : Currency.Dollar

  const onPressCTA = () => {
    if (userIsVerified) {
      navigate(Screens.FiatExchangeOptions, { isCashIn: true })
    } else {
      navigate(Screens.VerificationEducationScreen, { hideOnboardingStep: true })
    }
    ValoraAnalytics.track(RewardsEvents.rewards_screen_cta_pressed, {
      buttonPressed: userIsVerified ? RewardsScreenCta.CashIn : RewardsScreenCta.VerifyPhone,
    })
  }

  const onLearnMore = () => navigate(Screens.WebViewScreen, { uri: CELO_REWARDS_T_AND_C })

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Touchable
          style={[styles.closeButton, { marginTop: insets.top }]}
          onPress={navigateBack}
          borderless={true}
          hitSlop={variables.iconHitslop}
        >
          <Times />
        </Touchable>
        <Image source={boostRewards} />
        <Text style={styles.title}>{t('consumerIncentivesTitle')}</Text>
        <Text style={styles.description}>
          {t('consumerIncentivesSummary', { currency, percent: rewardsPercent })}
        </Text>
        <View style={styles.section}>
          <Image source={earn1} style={styles.sectionImage} resizeMode="contain" />
          <View style={styles.sectionText}>
            <Text style={fontStyles.regular600}>{t('earnWeekly.header')}</Text>
            <Text style={fontStyles.small}>{t('earnWeekly.text')}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Image source={earn2} style={styles.sectionImage} resizeMode="contain" />
          <View style={styles.sectionText}>
            <Text style={fontStyles.regular600}>{t('noMinCommitment.header')}</Text>
            {userIsVerified ? (
              <Text style={fontStyles.small}>
                {t('noMinCommitment.earningText', { minBalance, currency })}
              </Text>
            ) : (
              <Text style={fontStyles.small}>
                {t('noMinCommitment.connectText', { minBalance, currency })}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.section}>
          <Image source={earn3} style={styles.sectionImage} resizeMode="contain" />
          <View style={styles.sectionText}>
            <Text style={fontStyles.regular600}>{t('saveMoreEarnMore.header')}</Text>
            <Text style={fontStyles.small}>
              {t('saveMoreEarnMore.text', { maxBalance, currency, percent: rewardsPercent })}
            </Text>
          </View>
        </View>
        <Text style={[styles.description, { marginTop: 24 }]}>{t('conclusion')}</Text>
        <TouchableOpacity onPress={onLearnMore} testID="ConsumerIncentives/learnMore">
          <Text style={styles.learnMore}>{t('learnMore')}</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <Button
          size={BtnSizes.FULL}
          text={userIsVerified ? t('cashIn', { currency }) : t('connectNumber')}
          onPress={onPressCTA}
          testID="ConsumerIncentives/CTA"
        />
      </View>
    </SafeAreaView>
  )
}

ConsumerIncentivesHomeScreen.navOptions = noHeader

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentContainer: {
    alignItems: 'center',
    marginHorizontal: 24,
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  title: {
    ...fontStyles.h2,
    marginTop: 32,
    textAlign: 'center',
  },
  description: {
    ...fontStyles.regular,
    textAlign: 'center',
    marginTop: 12,
  },
  section: {
    flexDirection: 'row',
    marginTop: 24,
    flex: 1,
    width: '100%',
  },
  sectionImage: {
    marginRight: 12,
  },
  sectionText: {
    flexDirection: 'column',
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopColor: colors.gray2,
    borderTopWidth: 1,
  },
  learnMore: {
    ...fontStyles.notificationHeadline,
    fontSize: 17,
    marginVertical: 24,
    color: colors.greenUI,
  },
})
