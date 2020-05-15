// @flow

import { bns } from 'biggystring'
import { Scene } from 'edge-components'
import {
  type EdgeCurrencyInfo,
  type EdgeCurrencyWallet,
  type EdgeDenomination,
  type EdgeMetadata,
  type EdgeSpendInfo,
  type EdgeTransaction,
  errorNames
} from 'edge-core-js'
import React, { Component, Fragment } from 'react'
import { TouchableOpacity, View } from 'react-native'
import slowlog from 'react-native-slowlog'
import { connect } from 'react-redux'
import { sprintf } from 'sprintf-js'

import {
  getAuthRequiredDispatch,
  newPin,
  newSpendInfo,
  reset,
  sendConfirmationUpdateTx,
  signBroadcastAndSave,
  updateAmount,
  updateSpendPending,
  updateTransaction
} from '../../actions/SendConfirmationActions.js'
import { activated as uniqueIdentifierModalActivated } from '../../actions/UniqueIdentifierModalActions.js'
import { UniqueIdentifierModalConnect as UniqueIdentifierModal } from '../../connectors/UniqueIdentifierModalConnector.js'
import { FEE_ALERT_THRESHOLD, FEE_COLOR_THRESHOLD, getSpecialCurrencyInfo } from '../../constants/indexConstants.js'
import { intl } from '../../locales/intl'
import s from '../../locales/strings.js'
import { getDisplayDenomination, getExchangeDenomination as settingsGetExchangeDenomination, getPlugins } from '../../modules/Settings/selectors.js'
import ExchangeRate from '../../modules/UI/components/ExchangeRate/index.js'
import type { ExchangedFlipInputAmounts } from '../../modules/UI/components/FlipInput/ExchangedFlipInput2.js'
import { ExchangedFlipInput } from '../../modules/UI/components/FlipInput/ExchangedFlipInput2.js'
import Text from '../../modules/UI/components/FormattedText/index'
import { PinInput } from '../../modules/UI/components/PinInput/PinInput.ui.js'
import Recipient from '../../modules/UI/components/Recipient/index.js'
import ABSlider from '../../modules/UI/components/Slider/index.js'
import {
  type AuthType,
  getError,
  getForceUpdateGuiCounter,
  getKeyboardIsVisible,
  getPending,
  getPublicAddress,
  getSpendInfoWithoutState,
  getTransaction
} from '../../modules/UI/scenes/SendConfirmation/selectors.js'
import {
  convertCurrencyFromExchangeRates,
  getExchangeDenomination,
  getExchangeRate,
  getSelectedCurrencyCode,
  getSelectedWallet
} from '../../modules/UI/selectors.js'
import { type GuiMakeSpendInfo, type SendConfirmationState } from '../../reducers/scenes/SendConfirmationReducer.js'
import { rawStyles, styles } from '../../styles/scenes/SendConfirmationStyle.js'
import type { Dispatch, State as ReduxState } from '../../types/reduxTypes.js'
import type { GuiCurrencyInfo, GuiDenomination, GuiWallet } from '../../types/types.js'
import { convertNativeToDisplay, convertNativeToExchange, decimalOrZero, getCurrencyInfo, getDenomFromIsoCode } from '../../util/utils.js'
import { AddressTextWithBlockExplorerModal } from '../common/AddressTextWithBlockExplorerModal'
import { SceneWrapper } from '../common/SceneWrapper.js'
import { showError } from '../services/AirshipInstance'

const DIVIDE_PRECISION = 18

type OwnProps = {
  guiMakeSpendInfo: GuiMakeSpendInfo
}
type StateProps = {
  address: string,
  authRequired: 'pin' | 'none',
  balanceInCrypto: string,
  balanceInFiat: number,
  coreWallet: EdgeCurrencyWallet,
  currencyCode: string,
  currencyInfo: EdgeCurrencyInfo | null,
  errorMsg: string | null,
  exchangeRates: { [string]: number },
  fiatCurrencyCode: string,
  fiatPerCrypto: number,
  forceUpdateGuiCounter: number,
  guiWallet: GuiWallet,
  isConnected: boolean,
  isEditable: boolean,
  keyboardIsVisible: boolean,
  nativeAmount: string,
  networkFee: string | null,
  parentDisplayDenomination: EdgeDenomination,
  parentExchangeDenomination: GuiDenomination,
  parentNetworkFee: string | null,
  pending: boolean,
  primaryDisplayDenomination: EdgeDenomination,
  primaryExchangeDenomination: GuiDenomination,
  resetSlider: boolean,
  sceneState: SendConfirmationState,
  secondaryExchangeCurrencyCode: string,
  sliderDisabled: boolean,
  toggleCryptoOnTop: number,
  transactionMetadata: EdgeMetadata | null,
  uniqueIdentifier?: string
}
type DispatchProps = {
  getAuthRequiredDispatch(spendInfo: EdgeSpendInfo): void,
  newSpendInfo(spendInfo: EdgeSpendInfo, isLimitExceeded: AuthType): void,
  onChangePin(pin: string): void,
  reset(): void,
  sendConfirmationUpdateTx(guiMakeSpendInfo: GuiMakeSpendInfo): void,
  signBroadcastAndSave(): void,
  uniqueIdentifierButtonPressed(): void,
  updateAmount(nativeAmount: string, exchangeAmount: string, fiatPerCrypto: string): void,
  updateSpendPending(pending: boolean): void,
  updateTransaction(transaction?: EdgeTransaction, guiMakeSpendInfo?: GuiMakeSpendInfo, forceUpdateGui?: boolean, error?: Error): void
}
type Props = OwnProps & StateProps & DispatchProps

type State = {|
  secondaryDisplayDenomination: GuiDenomination,
  nativeAmount: string,
  overridePrimaryExchangeAmount: string,
  forceUpdateGuiCounter: number,
  keyboardVisible: boolean,
  showSpinner: boolean,
  isFiatOnTop: boolean,
  isFocus: boolean
|}

export class SendConfirmationComponent extends Component<Props, State> {
  pinInput: any
  flipInput: any

  constructor (props: Props) {
    super(props)
    slowlog(this, /.*/, global.slowlogOptions)
    this.state = {
      secondaryDisplayDenomination: {
        name: '',
        multiplier: '1',
        symbol: ''
      },
      overridePrimaryExchangeAmount: '',
      keyboardVisible: false,
      forceUpdateGuiCounter: 0,
      nativeAmount: props.nativeAmount,
      showSpinner: false,
      isFiatOnTop: !!(props.guiMakeSpendInfo && props.guiMakeSpendInfo.nativeAmount && bns.eq(props.guiMakeSpendInfo.nativeAmount, '0')),
      isFocus: !!(props.guiMakeSpendInfo && props.guiMakeSpendInfo.nativeAmount && bns.eq(props.guiMakeSpendInfo.nativeAmount, '0'))
    }
    this.flipInput = React.createRef()
  }

  componentDidMount () {
    const secondaryDisplayDenomination = getDenomFromIsoCode(this.props.fiatCurrencyCode)
    const overridePrimaryExchangeAmount = bns.div(this.props.nativeAmount, this.props.primaryExchangeDenomination.multiplier, DIVIDE_PRECISION)
    const guiMakeSpendInfo = this.props.guiMakeSpendInfo
    let keyboardVisible = true
    // Do not show the keyboard if the caller passed in an amount
    if (guiMakeSpendInfo.nativeAmount) {
      if (!bns.eq(guiMakeSpendInfo.nativeAmount, '0')) {
        keyboardVisible = false
      }
    } else if (guiMakeSpendInfo.spendTargets && guiMakeSpendInfo.spendTargets.length) {
      keyboardVisible = false
    }

    this.props.sendConfirmationUpdateTx(this.props.guiMakeSpendInfo)
    this.setState({ secondaryDisplayDenomination, overridePrimaryExchangeAmount, keyboardVisible })
  }

  componentDidUpdate (prevProps: Props) {
    if (!prevProps.transactionMetadata && this.props.transactionMetadata && this.props.authRequired !== 'none' && this.props.nativeAmount !== '0') {
      this.pinInput.focus()
    }
    if (prevProps.toggleCryptoOnTop !== this.props.toggleCryptoOnTop) {
      this.flipInput.current.toggleCryptoOnTop()
    }
  }

  UNSAFE_componentWillReceiveProps (nextProps: Props) {
    const newState = {}
    if (nextProps.forceUpdateGuiCounter !== this.state.forceUpdateGuiCounter) {
      const overridePrimaryExchangeAmount = bns.div(nextProps.nativeAmount, nextProps.primaryExchangeDenomination.multiplier, DIVIDE_PRECISION)
      newState.overridePrimaryExchangeAmount = overridePrimaryExchangeAmount
      newState.forceUpdateGuiCounter = nextProps.forceUpdateGuiCounter
    }
    if (nextProps.fiatCurrencyCode !== this.props.fiatCurrencyCode) {
      newState.secondaryDisplayDenomination = getDenomFromIsoCode(nextProps.fiatCurrencyCode)
    }

    const feeCalculated = !!nextProps.networkFee || !!nextProps.parentNetworkFee
    if (feeCalculated || nextProps.errorMsg || nextProps.nativeAmount === '0') {
      newState.showSpinner = false
    }

    this.setState(newState)
  }

  componentWillUnmount () {
    this.props.reset()
    if (this.props.guiMakeSpendInfo && this.props.guiMakeSpendInfo.onBack) {
      this.props.guiMakeSpendInfo.onBack()
    }
  }

  render () {
    const { networkFee, parentNetworkFee, guiWallet } = this.props
    const primaryInfo: GuiCurrencyInfo = {
      displayCurrencyCode: this.props.currencyCode,
      displayDenomination: this.props.primaryDisplayDenomination,
      exchangeCurrencyCode: this.props.primaryExchangeDenomination.name,
      exchangeDenomination: this.props.primaryExchangeDenomination
    }

    let exchangeCurrencyCode = this.props.secondaryExchangeCurrencyCode

    if (this.props.secondaryExchangeCurrencyCode === '') {
      // There is no `EdgeDenomination.currencyCode`,
      // so this should never even run: $FlowFixMe
      if (this.state.secondaryDisplayDenomination.currencyCode) {
        exchangeCurrencyCode = this.state.secondaryDisplayDenomination.name
      }
    }

    const secondaryInfo: GuiCurrencyInfo = {
      displayCurrencyCode: this.props.fiatCurrencyCode,
      displayDenomination: this.state.secondaryDisplayDenomination,
      exchangeCurrencyCode: exchangeCurrencyCode,
      exchangeDenomination: this.state.secondaryDisplayDenomination
    }

    const cryptoBalanceAmount: string = convertNativeToDisplay(primaryInfo.displayDenomination.multiplier)(this.props.balanceInCrypto) // convert to correct denomination
    const cryptoBalanceAmountString = cryptoBalanceAmount ? intl.formatNumber(decimalOrZero(bns.toFixed(cryptoBalanceAmount, 0, 6), 6)) : '0' // limit decimals and check if infitesimal, also cut off trailing zeroes (to right of significant figures)
    const balanceInFiatString = intl.formatNumber(this.props.balanceInFiat || 0, { toFixed: 2 })

    const { address, authRequired, currencyCode, transactionMetadata, uniqueIdentifier, currencyInfo } = this.props
    const addressExplorer = currencyInfo ? currencyInfo.addressExplorer : null
    const destination = transactionMetadata ? transactionMetadata.name : ''
    const DESTINATION_TEXT = sprintf(s.strings.send_confirmation_to, destination)
    const ADDRESS_TEXT = sprintf(s.strings.send_confirmation_address, address)
    const fioAddress = this.props.guiMakeSpendInfo && this.props.guiMakeSpendInfo.fioAddress ? this.props.guiMakeSpendInfo.fioAddress : ''
    const memo = this.props.guiMakeSpendInfo && this.props.guiMakeSpendInfo.memo ? this.props.guiMakeSpendInfo.memo : ''
    const displayAddress = fioAddress ? '' : address

    const feeCalculated = !!networkFee || !!parentNetworkFee

    const sliderDisabled =
      this.props.sliderDisabled || !feeCalculated || (!getSpecialCurrencyInfo(this.props.currencyCode).allowZeroTx && this.props.nativeAmount === '0')

    const isTaggableCurrency = !!getSpecialCurrencyInfo(currencyCode).uniqueIdentifier
    const networkFeeData = this.getNetworkFeeData()

    const flipInputHeaderText = guiWallet ? sprintf(s.strings.send_from_wallet, guiWallet.name) : ''
    const flipInputHeaderLogo = guiWallet.symbolImageDarkMono
    return (
      <Fragment>
        <SceneWrapper>
          <View style={styles.mainScrollView}>
            <View style={[styles.balanceContainer, styles.error]}>
              <Text style={styles.balanceText}>
                {s.strings.send_confirmation_balance} {cryptoBalanceAmountString} {primaryInfo.displayDenomination.name} (
                {secondaryInfo.displayDenomination.symbol} {balanceInFiatString})
              </Text>
            </View>

            <View style={[styles.exchangeRateContainer, styles.error]}>
              {this.props.errorMsg ? (
                <Text style={[styles.error, styles.errorText]} numberOfLines={3}>
                  {this.props.errorMsg}
                </Text>
              ) : (
                <ExchangeRate secondaryDisplayAmount={this.props.fiatPerCrypto} primaryInfo={primaryInfo} secondaryInfo={secondaryInfo} />
              )}
            </View>

            <View style={styles.main}>
              <ExchangedFlipInput
                headerText={flipInputHeaderText}
                headerLogo={flipInputHeaderLogo}
                primaryCurrencyInfo={{ ...primaryInfo }}
                secondaryCurrencyInfo={{ ...secondaryInfo }}
                exchangeSecondaryToPrimaryRatio={this.props.fiatPerCrypto}
                overridePrimaryExchangeAmount={this.state.overridePrimaryExchangeAmount}
                forceUpdateGuiCounter={this.state.forceUpdateGuiCounter}
                onExchangeAmountChanged={this.onExchangeAmountChanged}
                keyboardVisible={this.state.keyboardVisible}
                isEditable={this.props.isEditable}
                isFiatOnTop={this.state.isFiatOnTop}
                isFocus={this.state.isFocus}
                ref={this.flipInput}
              />

              <Scene.Padding style={{ paddingHorizontal: 54 }}>
                <Scene.Item style={{ alignItems: 'center', flex: -1 }}>
                  <Scene.Row style={{ paddingVertical: 4 }}>
                    <Text style={[styles.feeAreaText, networkFeeData.feeStyle]}>{networkFeeData.feeSyntax}</Text>
                  </Scene.Row>

                  {!!destination && (
                    <Scene.Row style={{ paddingVertical: 10 }}>
                      <Recipient.Text style={{}}>
                        <Text>{DESTINATION_TEXT}</Text>
                      </Recipient.Text>
                    </Scene.Row>
                  )}

                  {!!displayAddress && (
                    <AddressTextWithBlockExplorerModal address={address} addressExplorer={addressExplorer}>
                      <Scene.Row style={{ paddingVertical: 4 }}>
                        <Recipient.Text style={{}}>
                          <Text>{ADDRESS_TEXT}</Text>
                        </Recipient.Text>
                      </Scene.Row>
                    </AddressTextWithBlockExplorerModal>
                  )}

                  {!!fioAddress && (
                    <Scene.Row style={{ paddingVertical: 10 }}>
                      <Recipient.Text style={{}}>
                        <Text>{sprintf(s.strings.fio_address, fioAddress)}</Text>
                      </Recipient.Text>
                    </Scene.Row>
                  )}

                  {!!memo && (
                    <Scene.Row style={{ paddingBottom: 5, paddingTop: 10 }}>
                      <Recipient.Text style={{}}>
                        <Text>{fioAddress ? s.strings.unique_identifier_memo : ''}:</Text>
                      </Recipient.Text>
                    </Scene.Row>
                  )}

                  {!!memo && (
                    <Scene.Row style={{ paddingTop: 0, paddingBottom: 10 }}>
                      <Text style={styles.rowText}>{memo}</Text>
                    </Scene.Row>
                  )}

                  {isTaggableCurrency && (
                    <Scene.Row style={{ paddingVertical: 10 }}>
                      <TouchableOpacity
                        activeOpacity={rawStyles.activeOpacity}
                        style={styles.addUniqueIDButton}
                        onPress={this.props.uniqueIdentifierButtonPressed}
                      >
                        <Text style={styles.addUniqueIDButtonText} ellipsizeMode={'tail'}>
                          {uniqueIdentifierText(currencyCode, uniqueIdentifier)}
                        </Text>
                      </TouchableOpacity>
                    </Scene.Row>
                  )}

                  {authRequired === 'pin' && (
                    <Scene.Row style={{ paddingBottom: 10, width: '100%', justifyContent: 'flex-start', alignItems: 'center' }}>
                      <Text style={styles.rowText}>{s.strings.four_digit_pin}</Text>

                      <View style={styles.pinInputSpacer} />

                      <View style={styles.pinInputContainer}>
                        <PinInput ref={ref => (this.pinInput = ref)} onChangePin={this.handleChangePin} returnKeyType="done" />
                      </View>
                    </Scene.Row>
                  )}
                </Scene.Item>
              </Scene.Padding>
            </View>
            <Scene.Footer style={[styles.footer, isTaggableCurrency && styles.footerWithPaymentId]}>
              <ABSlider
                forceUpdateGuiCounter={this.state.forceUpdateGuiCounter}
                resetSlider={this.props.resetSlider}
                parentStyle={styles.sliderStyle}
                onSlidingComplete={this.props.signBroadcastAndSave}
                sliderDisabled={sliderDisabled}
                showSpinner={this.state.showSpinner || this.props.pending}
              />
            </Scene.Footer>
          </View>
        </SceneWrapper>
        {isTaggableCurrency && (
          <UniqueIdentifierModal
            onConfirm={this.props.sendConfirmationUpdateTx}
            currencyCode={currencyCode}
            keyboardType={getSpecialCurrencyInfo(currencyCode).uniqueIdentifier.identifierKeyboardType}
          />
        )}
      </Fragment>
    )
  }

  handleChangePin = (pin: string) => {
    this.props.onChangePin(pin)
    if (pin.length >= 4) {
      this.pinInput.blur()
    }
  }

  onExchangeAmountChanged = async ({ nativeAmount, exchangeAmount }: ExchangedFlipInputAmounts) => {
    const { fiatPerCrypto, coreWallet, sceneState, currencyCode, newSpendInfo, updateTransaction, getAuthRequiredDispatch, isConnected } = this.props
    if (!isConnected) {
      showError(s.strings.fio_network_alert_text)
      return
    }
    this.setState({ showSpinner: true })
    const amountFiatString: string = bns.mul(exchangeAmount, fiatPerCrypto.toString())
    const amountFiat: number = parseFloat(amountFiatString)
    const metadata: EdgeMetadata = { amountFiat }
    const guiMakeSpendInfo = { nativeAmount, metadata }

    const guiMakeSpendInfoClone = { ...guiMakeSpendInfo }
    const spendInfo = getSpendInfoWithoutState(guiMakeSpendInfoClone, sceneState, currencyCode)
    const authType: any = getAuthRequiredDispatch(spendInfo) // Type casting any cause dispatch returns a function
    try {
      newSpendInfo(spendInfo, authType)
      const edgeTransaction = await coreWallet.makeSpend(spendInfo)
      updateTransaction(edgeTransaction, guiMakeSpendInfoClone, false, undefined)
      this.setState({ showSpinner: false })
    } catch (e) {
      console.log(e)
      updateTransaction(undefined, guiMakeSpendInfoClone, false, e)
    }
  }

  getNetworkFeeData = (): { feeSyntax: string, feeStyle: Object } => {
    const { networkFee, parentNetworkFee, parentDisplayDenomination, exchangeRates } = this.props
    let feeStyle = {}

    const primaryInfo: GuiCurrencyInfo = {
      displayCurrencyCode: this.props.currencyCode,
      displayDenomination: this.props.primaryDisplayDenomination,
      exchangeCurrencyCode: this.props.primaryExchangeDenomination.name,
      exchangeDenomination: this.props.primaryExchangeDenomination
    }

    let exchangeCurrencyCode = this.props.secondaryExchangeCurrencyCode

    if (this.props.secondaryExchangeCurrencyCode === '') {
      // There is no `EdgeDenomination.currencyCode`,
      // so this should never even run: $FlowFixMe
      if (this.state.secondaryDisplayDenomination.currencyCode) {
        exchangeCurrencyCode = this.state.secondaryDisplayDenomination.name
      }
    }

    const secondaryInfo: GuiCurrencyInfo = {
      displayCurrencyCode: this.props.fiatCurrencyCode,
      displayDenomination: this.state.secondaryDisplayDenomination,
      exchangeCurrencyCode: exchangeCurrencyCode,
      exchangeDenomination: this.state.secondaryDisplayDenomination
    }

    let denomination, exchangeDenomination, usedNetworkFee, currencyCode
    if (!networkFee && !parentNetworkFee) {
      // if no fee
      const cryptoFeeSymbolParent = parentDisplayDenomination.symbol ? parentDisplayDenomination.symbol : null
      const cryptoFeeSymbolPrimary = primaryInfo.displayDenomination.symbol ? primaryInfo.displayDenomination.symbol : null
      const cryptoFeeSymbol = () => {
        if (cryptoFeeSymbolParent) return cryptoFeeSymbolParent
        if (cryptoFeeSymbolPrimary) return cryptoFeeSymbolPrimary
        return ''
      }
      const fiatFeeSymbol = secondaryInfo.displayDenomination.symbol ? secondaryInfo.displayDenomination.symbol : ''
      return {
        feeSyntax: sprintf(s.strings.send_confirmation_fee_line, `${cryptoFeeSymbol()} 0`, `${fiatFeeSymbol} 0`),
        feeStyle
      }
      // if parentNetworkFee greater than zero
    }
    if (parentNetworkFee && bns.gt(parentNetworkFee, '0')) {
      denomination = parentDisplayDenomination
      exchangeDenomination = this.props.parentExchangeDenomination
      usedNetworkFee = parentNetworkFee
      currencyCode = exchangeDenomination.name
      // if networkFee greater than zero
    } else if (networkFee && bns.gt(networkFee, '0')) {
      denomination = primaryInfo.displayDenomination
      exchangeDenomination = this.props.primaryExchangeDenomination
      usedNetworkFee = networkFee
      currencyCode = this.props.currencyCode
    } else {
      // catch-all scenario if only existing fee is negative (shouldn't be possible)
      return {
        feeSyntax: '',
        feeStyle: {}
      }
    }
    const cryptoFeeSymbol = denomination.symbol ? denomination.symbol : ''
    const displayDenomMultiplier = denomination.multiplier
    const cryptoFeeMultiplier = exchangeDenomination.multiplier
    const cryptoFeeExchangeDenomAmount = usedNetworkFee ? convertNativeToDisplay(cryptoFeeMultiplier)(usedNetworkFee) : ''

    const exchangeToDisplayMultiplierRatio = bns.div(cryptoFeeMultiplier, displayDenomMultiplier, DIVIDE_PRECISION)
    const cryptoFeeDisplayDenomAmount = bns.mul(cryptoFeeExchangeDenomAmount, exchangeToDisplayMultiplierRatio)
    const cryptoFeeString = `${cryptoFeeSymbol} ${cryptoFeeDisplayDenomAmount}`
    const fiatFeeSymbol = secondaryInfo.displayDenomination.symbol ? secondaryInfo.displayDenomination.symbol : ''
    const exchangeConvertor = convertNativeToExchange(exchangeDenomination.multiplier)
    const cryptoFeeExchangeAmount = exchangeConvertor(usedNetworkFee)
    const fiatFeeAmount = convertCurrencyFromExchangeRates(exchangeRates, currencyCode, secondaryInfo.exchangeCurrencyCode, parseFloat(cryptoFeeExchangeAmount))
    const fiatFeeAmountString = fiatFeeAmount.toFixed(2)
    const fiatFeeAmountPretty = bns.toFixed(fiatFeeAmountString, 2, 2)
    const fiatFeeString = `${fiatFeeSymbol} ${fiatFeeAmountPretty}`
    const feeAmountInUSD = convertCurrencyFromExchangeRates(exchangeRates, currencyCode, 'iso:USD', parseFloat(cryptoFeeExchangeAmount))
    // check if fee is high enough to signal a warning to user (via font color)
    if (feeAmountInUSD > FEE_ALERT_THRESHOLD) {
      feeStyle = styles.feeDanger
    } else if (feeAmountInUSD > FEE_COLOR_THRESHOLD) {
      feeStyle = styles.feeWarning
    }
    return {
      feeSyntax: sprintf(s.strings.send_confirmation_fee_line, cryptoFeeString, fiatFeeString),
      feeStyle
    }
  }
}

export const uniqueIdentifierText = (currencyCode: string, uniqueIdentifier?: string): string => {
  if (!getSpecialCurrencyInfo(currencyCode).uniqueIdentifier) {
    throw new Error('Invalid currency code')
  }
  const uniqueIdentifierInfo = getSpecialCurrencyInfo(currencyCode).uniqueIdentifier
  if (!uniqueIdentifier) {
    return uniqueIdentifierInfo.addButtonText
  } else {
    return sprintf(`${uniqueIdentifierInfo.identifierName}: %s`, uniqueIdentifier)
  }
}

export const SendConfirmationScene = connect(
  (state: ReduxState): StateProps => {
    const sceneState = state.ui.scenes.sendConfirmation
    let fiatPerCrypto = 0
    let secondaryExchangeCurrencyCode = ''

    const { currencyWallets = {} } = state.core.account
    const guiWallet = getSelectedWallet(state)
    const coreWallet = currencyWallets[guiWallet.id]
    const currencyCode = getSelectedCurrencyCode(state)
    const balanceInCrypto = guiWallet.nativeBalances[currencyCode]

    const isoFiatCurrencyCode = guiWallet.isoFiatCurrencyCode
    const exchangeDenomination = settingsGetExchangeDenomination(state, currencyCode)
    const balanceInCryptoDisplay = convertNativeToExchange(exchangeDenomination.multiplier)(balanceInCrypto)
    fiatPerCrypto = getExchangeRate(state, currencyCode, isoFiatCurrencyCode)
    const balanceInFiat = fiatPerCrypto * parseFloat(balanceInCryptoDisplay)

    const plugins: Object = getPlugins(state)
    const allCurrencyInfos: Array<EdgeCurrencyInfo> = plugins.allCurrencyInfos
    const currencyInfo: EdgeCurrencyInfo | void = getCurrencyInfo(allCurrencyInfos, currencyCode)

    if (guiWallet) {
      const isoFiatCurrencyCode = guiWallet.isoFiatCurrencyCode
      secondaryExchangeCurrencyCode = isoFiatCurrencyCode
    }

    const transaction = getTransaction(state)
    const pending = getPending(state)
    const nativeAmount = sceneState.nativeAmount
    // const nativeAmount = getNativeAmount(state)
    let error = getError(state)

    let errorMsg = null
    let resetSlider = false
    // consider refactoring this method for resetting slider
    if (error && (error.message === 'broadcastError' || error.message === 'transactionCancelled')) {
      error = null
      resetSlider = true
    }
    errorMsg = error ? error.message : ''
    if (error && error.name === errorNames.NoAmountSpecifiedError) errorMsg = ''
    const networkFee = transaction ? transaction.networkFee : null
    const parentNetworkFee = transaction && transaction.parentNetworkFee ? transaction.parentNetworkFee : null
    const uniqueIdentifier = sceneState.guiMakeSpendInfo.uniqueIdentifier
    const transactionMetadata = sceneState.transactionMetadata
    const exchangeRates = state.exchangeRates
    const { toggleCryptoOnTop } = sceneState

    return {
      address: state.ui.scenes.sendConfirmation.address,
      authRequired: state.ui.scenes.sendConfirmation.authRequired,
      balanceInCrypto,
      balanceInFiat,
      coreWallet,
      currencyCode,
      currencyInfo: currencyInfo || null,
      errorMsg,
      exchangeRates,
      fiatCurrencyCode: guiWallet.fiatCurrencyCode,
      fiatPerCrypto,
      forceUpdateGuiCounter: getForceUpdateGuiCounter(state),
      guiWallet,
      isConnected: state.network.isConnected,
      isEditable: sceneState.isEditable,
      keyboardIsVisible: getKeyboardIsVisible(state),
      nativeAmount,
      networkFee,
      parentDisplayDenomination: getDisplayDenomination(state, guiWallet.currencyCode),
      parentExchangeDenomination: getExchangeDenomination(state, guiWallet.currencyCode),
      parentNetworkFee,
      pending,
      primaryDisplayDenomination: getDisplayDenomination(state, currencyCode),
      primaryExchangeDenomination: getExchangeDenomination(state, currencyCode),
      publicAddress: getPublicAddress(state),
      resetSlider,
      sceneState,
      secondaryExchangeCurrencyCode,
      sliderDisabled: !transaction || !!error || !!pending,
      toggleCryptoOnTop,
      transactionMetadata,
      uniqueIdentifier
    }
  },
  (dispatch: Dispatch): DispatchProps => ({
    getAuthRequiredDispatch (spendInfo: EdgeSpendInfo): void {
      dispatch(getAuthRequiredDispatch(spendInfo))
    },
    newSpendInfo: (spendInfo: EdgeSpendInfo, isLimitExceeded: AuthType) => {
      return dispatch(newSpendInfo(spendInfo, isLimitExceeded))
    },
    onChangePin (pin: string): void {
      dispatch(newPin(pin))
    },
    reset (): void {
      dispatch(reset())
    },
    sendConfirmationUpdateTx (guiMakeSpendInfo: GuiMakeSpendInfo): void {
      dispatch(sendConfirmationUpdateTx(guiMakeSpendInfo))
    },
    signBroadcastAndSave (): void {
      dispatch(signBroadcastAndSave())
    },
    uniqueIdentifierButtonPressed (): void {
      dispatch(uniqueIdentifierModalActivated())
    },
    updateAmount (nativeAmount: string, exchangeAmount: string, fiatPerCrypto: string) {
      return dispatch(updateAmount(nativeAmount, exchangeAmount, fiatPerCrypto))
    },
    updateSpendPending (pending: boolean): void {
      dispatch(updateSpendPending(pending))
    },
    updateTransaction (transaction?: EdgeTransaction, guiMakeSpendInfo?: GuiMakeSpendInfo, forceUpdateGui?: boolean, error?: Error) {
      dispatch(updateTransaction(transaction, guiMakeSpendInfo, forceUpdateGui, error))
    }
  })
)(SendConfirmationComponent)
