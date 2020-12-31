// @flow

import { bns } from 'biggystring'
import * as React from 'react'
import { Image, TouchableOpacity, View } from 'react-native'
import { Actions } from 'react-native-router-flux'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { connect } from 'react-redux'

import { toggleAccountBalanceVisibility } from '../../actions/WalletListActions.js'
import credLogo from '../../assets/images/cred_logo.png'
import { getSpecialCurrencyInfo } from '../../constants/indexConstants.js'
import { guiPlugins } from '../../constants/plugins/GuiPlugins.js'
import * as intl from '../../locales/intl.js'
import s from '../../locales/strings.js'
import { convertCurrency } from '../../modules/UI/selectors.js'
import { type Dispatch, type RootState } from '../../types/reduxTypes.js'
import { convertNativeToDenomination, decimalOrZero, getDefaultDenomination, getDenomination, getFiatSymbol } from '../../util/utils'
import { type Theme, type ThemeProps, cacheStyles, withTheme } from '../services/ThemeContext.js'
import { EdgeText } from './EdgeText.js'
import { ButtonBox } from './ThemedButtons.js'
import { WalletProgressIcon } from './WalletProgressIcon.js'

type OwnProps = {
  walletId: string,
  isEmpty: boolean
}

export type StateProps = {
  cryptoAmount: string,
  currencyDenominationSymbol: string,
  currencyCode: string,
  currencyName: string,
  fiatCurrencyCode: string,
  fiatBalance: number,
  fiatSymbol: string,
  walletName: string,
  isAccountBalanceVisible: boolean,
  transactionsLength: number
}

export type DispatchProps = {
  toggleBalanceVisibility: () => void
}

type Props = OwnProps & StateProps & DispatchProps & ThemeProps

class TransactionListTopComponent extends React.PureComponent<Props> {
  renderEarnInterestCard = () => {
    const { currencyCode, transactionsLength, theme } = this.props
    const styles = getStyles(theme)

    if (transactionsLength !== 0 && getSpecialCurrencyInfo(currencyCode).showEarnInterestCard) {
      return (
        <ButtonBox onPress={() => Actions.pluginEarnInterest({ plugin: guiPlugins.cred })} paddingRem={0}>
          <View style={styles.earnInterestContainer}>
            <Image style={styles.earnInterestImage} source={credLogo} resizeMode="contain" />
            <EdgeText style={styles.earnInterestText}>{s.strings.earn_interest}</EdgeText>
          </View>
        </ButtonBox>
      )
    }
  }

  renderBalanceBox = () => {
    const { cryptoAmount, currencyCode, fiatSymbol, fiatBalance, fiatCurrencyCode, walletId, walletName, isAccountBalanceVisible, theme } = this.props
    const styles = getStyles(theme)

    return (
      <View style={styles.balanceBoxContainer}>
        <View style={styles.balanceBoxRow}>
          <TouchableOpacity onPress={this.props.toggleBalanceVisibility} style={styles.balanceBoxBalanceContainer}>
            {isAccountBalanceVisible ? (
              <>
                <EdgeText style={styles.balanceBoxWalletName}>{walletName}</EdgeText>
                <EdgeText style={styles.balanceBoxCurrency}>{cryptoAmount + ' ' + currencyCode}</EdgeText>
                <EdgeText style={styles.balanceFiatBalance}>{fiatSymbol + fiatBalance + ' ' + fiatCurrencyCode}</EdgeText>
              </>
            ) : (
              <EdgeText style={styles.balanceFiatShow}>{s.strings.string_show_balance}</EdgeText>
            )}
          </TouchableOpacity>
          <View style={styles.balanceBoxWalletProgressIconContainer}>
            <WalletProgressIcon walletId={walletId} size={theme.rem(2.5)} />
          </View>
        </View>
      </View>
    )
  }

  render() {
    const { isEmpty, theme } = this.props
    const styles = getStyles(theme)

    return (
      <View style={styles.container}>
        {this.renderBalanceBox()}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity onPress={Actions.request} style={styles.buttons}>
            <Ionicons name="arrow-down" size={theme.rem(1.5)} color={theme.iconTappable} />
            <EdgeText style={styles.buttonsText}>{s.strings.fragment_request_subtitle}</EdgeText>
          </TouchableOpacity>
          <View style={styles.buttonsDivider} />
          <TouchableOpacity onPress={Actions.scan} style={styles.buttons}>
            <Ionicons name="arrow-up" size={theme.rem(1.5)} color={theme.iconTappable} />
            <EdgeText style={styles.buttonsText}>{s.strings.fragment_send_subtitle}</EdgeText>
          </TouchableOpacity>
        </View>
        {this.renderEarnInterestCard()}

        {!isEmpty && (
          <View style={styles.transactionsDividerContainer}>
            <EdgeText style={styles.transactionsDividerText}>{s.strings.fragment_transaction_list_transaction}</EdgeText>
          </View>
        )}
      </View>
    )
  }
}

const getStyles = cacheStyles((theme: Theme) => ({
  container: {
    flex: 1,
    paddingLeft: theme.rem(2),
    marginBottom: theme.rem(0.5)
  },

  // Balance Box
  balanceBoxContainer: {
    height: theme.rem(5.25),
    marginVertical: theme.rem(1),
    marginRight: theme.rem(2)
  },
  balanceBoxRow: {
    flexDirection: 'row'
  },
  balanceBoxBalanceContainer: {
    flex: 1
  },
  balanceBoxWalletName: {
    fontSize: theme.rem(1.25)
  },
  balanceBoxCurrency: {
    fontSize: theme.rem(2),
    fontFamily: theme.fontFaceBold
  },
  balanceFiatBalance: {
    fontSize: theme.rem(1.25)
  },
  balanceFiatShow: {
    fontSize: theme.rem(2)
  },
  balanceBoxWalletProgressIconContainer: {
    height: theme.rem(7.75)
  },

  // Send/Receive Buttons
  buttonsContainer: {
    flexDirection: 'row',
    marginBottom: theme.rem(1)
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: theme.rem(6),
    height: theme.rem(3)
  },
  buttonsDivider: {
    width: theme.rem(2)
  },
  buttonsText: {
    fontSize: theme.rem(1),
    color: theme.textLink,
    fontFamily: theme.fontFaceBold,
    marginLeft: theme.rem(0.25)
  },

  // Earn Interest Card
  earnInterestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: theme.rem(6),
    backgroundColor: theme.tileBackground
  },
  earnInterestImage: {
    width: theme.rem(2.5),
    height: theme.rem(2.5),
    padding: theme.rem(1)
  },
  earnInterestText: {
    fontFamily: theme.fontFaceBold
  },

  // Transactions Divider
  transactionsDividerContainer: {
    paddingBottom: theme.rem(0.75),
    borderBottomWidth: theme.thinLineWidth,
    borderBottomColor: theme.lineDivider
  },
  transactionsDividerText: {
    fontFamily: theme.fontFaceBold
  }
}))

export const TransactionListTop = connect(
  (state: RootState) => {
    const selectedWalletId = state.ui.wallets.selectedWalletId
    const selectedCurrencyCode = state.ui.wallets.selectedCurrencyCode
    const guiWallet = state.ui.wallets.byId[selectedWalletId]
    const balance = guiWallet.nativeBalances[selectedCurrencyCode]

    // Crypto Amount Formatting
    const currencyDenomination = getDenomination(selectedCurrencyCode, state.ui.settings)
    const cryptoAmount: string = convertNativeToDenomination(currencyDenomination.multiplier)(balance) // convert to correct denomination
    const cryptoAmountFormat = cryptoAmount ? intl.formatNumber(decimalOrZero(bns.toFixed(cryptoAmount, 0, 6), 6)) : '0' // limit decimals and check if infitesimal, also cut off trailing zeroes (to right of significant figures)

    // Fiat Balance Formatting
    const defaultDenomination = getDefaultDenomination(selectedCurrencyCode, state.ui.settings)
    const defaultCryptoAmount = convertNativeToDenomination(defaultDenomination.multiplier)(balance)
    const fiatBalance = convertCurrency(state, selectedCurrencyCode, guiWallet.isoFiatCurrencyCode, parseFloat(defaultCryptoAmount))
    const fiatBalanceFormat = intl.formatNumber(fiatBalance && fiatBalance > 0.000001 ? fiatBalance : 0, { toFixed: 2 })

    return {
      currencyCode: selectedCurrencyCode,
      currencyName: guiWallet.currencyNames[selectedCurrencyCode],
      currencyDenominationSymbol: currencyDenomination.symbol,
      cryptoAmount: cryptoAmountFormat,
      fiatCurrencyCode: guiWallet.fiatCurrencyCode,
      fiatBalance: fiatBalanceFormat,
      fiatSymbol: getFiatSymbol(guiWallet.isoFiatCurrencyCode),
      walletName: guiWallet.name,
      isAccountBalanceVisible: state.ui.settings.isAccountBalanceVisible,
      transactionsLength: state.ui.scenes.transactionList.transactions.length
    }
  },
  (dispatch: Dispatch): DispatchProps => ({
    toggleBalanceVisibility() {
      dispatch(toggleAccountBalanceVisibility())
    }
  })
)(withTheme(TransactionListTopComponent))
