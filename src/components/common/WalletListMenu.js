// @flow

import * as React from 'react'
import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import slowlog from 'react-native-slowlog'
import { sprintf } from 'sprintf-js'

import { type WalletListMenuKey } from '../../actions/WalletListMenuActions.js'
import { WALLET_LIST_MENU } from '../../constants/WalletAndCurrencyConstants.js'
import s from '../../locales/strings.js'
import { THEME } from '../../theme/variables/airbitz.js'
import { scale } from '../../util/scaling.js'
import { WalletListMenuModal } from '../modals/WalletListMenuModal.js'
import { Airship } from '../services/AirshipInstance.js'

export type Option = {
  value: WalletListMenuKey,
  label: string
}

type Props = {
  currencyCode?: string,
  customStyles: StyleSheet.Styles,
  executeWalletRowOption: (walletId: string, option: WalletListMenuKey, currencyCode?: string) => void,
  walletId: string,
  isToken?: boolean,
  currencyName?: string,
  image?: string
}

export class WalletListMenu extends React.Component<Props> {
  options: Array<Option>

  constructor(props: Props) {
    super(props)
    const { currencyCode, isToken } = props

    this.options = []

    // Non main wallet options
    if (!currencyCode) {
      this.options.push({
        label: s.strings.string_get_raw_keys,
        value: 'getRawKeys'
      })
      return
    }

    if (isToken) {
      this.options.push({
        label: s.strings.fragment_wallets_export_transactions,
        value: 'exportWalletTransactions'
      })
      return
    }

    // Main wallet options
    for (const option of WALLET_LIST_MENU) {
      const { currencyCodes, label, value } = option
      if (currencyCodes != null && !currencyCodes.includes(currencyCode)) continue

      const temp = { label, value }
      if (option.value === 'split') {
        const splitString = s.strings.string_split_wallet
        const currencyName = currencyCode === 'BTC' ? 'Bitcoin Cash' : 'Bitcoin SV'
        temp.label = sprintf(splitString, currencyName)
      }
      this.options.push(temp)
    }
    slowlog(this, /.*/, global.slowlogOptions)
  }

  optionAction = (optionKey: WalletListMenuKey) => {
    const { walletId, executeWalletRowOption, currencyCode } = this.props
    executeWalletRowOption(walletId, optionKey, currencyCode)
  }

  openWalletListMenuModal = async () => {
    const { currencyName, currencyCode, image } = this.props
    const optionKey = await Airship.show(bridge => (
      <WalletListMenuModal bridge={bridge} options={this.options} currencyName={currencyName} currencyCode={currencyCode} image={image} />
    ))
    optionKey && this.optionAction(optionKey)
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={this.openWalletListMenuModal}>
        <View style={style.menuIconWrap}>
          <Text style={style.icon}>&#8942;</Text>
        </View>
      </TouchableWithoutFeedback>
    )
  }
}

const style = {
  menuIconWrap: {
    width: scale(46),
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: {
    fontSize: scale(20),
    color: THEME.COLORS.GRAY_1
  }
}
