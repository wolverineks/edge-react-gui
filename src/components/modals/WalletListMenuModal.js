// @flow

import React, { PureComponent } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import AntDesignIcon from 'react-native-vector-icons/AntDesign'

import { type WalletListMenuKey } from '../../actions/WalletListMenuActions.js'
import type { Option } from '../common/WalletListMenu.js'
import { type Theme, type ThemeProps, cacheStyles, withTheme } from '../services/ThemeContext.js'
import { ThemedModal } from '../themed/ThemedModal.js'
import { type AirshipBridge } from './modalParts'

type OwnProps = {
  bridge: AirshipBridge<WalletListMenuKey | null>,
  currencyCode?: string,
  currencyName?: string,
  image?: string,
  options: Array<Option>
}

type Props = OwnProps & ThemeProps

const icons = {
  delete: 'warning',
  exportWalletTransactions: 'export',
  getRawKeys: 'lock',
  getSeed: 'key',
  manageTokens: 'plus',
  rename: 'edit',
  resync: 'sync',
  split: 'arrowsalt',
  viewXPub: 'eye'
}

class WalletListMenuModalComponent extends PureComponent<Props> {
  render() {
    const { bridge, currencyCode, currencyName, image, options, theme } = this.props
    const styles = getStyles(theme)
    return (
      <ThemedModal bridge={bridge} onCancel={() => bridge.resolve(null)} paddingRem={0}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.text}>{currencyName}</Text>
            <View style={styles.headerImageContainer}>
              {image && <Image style={styles.currencyImage} source={{ uri: image }} resizeMode="cover" />}
              <Text style={styles.text}>{currencyCode}</Text>
            </View>
          </View>
          <View>
            {options.map((option: Option, index: number) => {
              return (
                <TouchableOpacity onPress={() => bridge.resolve(option.value)} key={option.value}>
                  <View style={[styles.optionContainer, options.length > index + 1 ? styles.optionMargin : null]}>
                    <AntDesignIcon name={icons[option.value]} size={theme.rem(1)} color={option.value === 'delete' ? theme.warningIcon : theme.icon} />
                    <Text style={[option.value === 'delete' ? styles.warningText : styles.text, styles.optionText]}>{option.label}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ThemedModal>
    )
  }
}

const getStyles = cacheStyles((theme: Theme) => ({
  container: {
    padding: theme.rem(1)
  },
  headerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: theme.rem(1)
  },
  text: {
    fontSize: theme.rem(1),
    fontFamily: theme.fontFaceDefault,
    color: theme.primaryText
  },
  warningText: {
    fontSize: theme.rem(1),
    fontFamily: theme.fontFaceDefault,
    color: theme.warningText
  },
  headerImageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  currencyImage: {
    width: theme.rem(1),
    height: theme.rem(1),
    marginRight: theme.rem(0.25)
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  optionMargin: {
    marginBottom: theme.rem(2)
  },
  optionText: {
    marginLeft: theme.rem(1)
  }
}))

export const WalletListMenuModal = withTheme(WalletListMenuModalComponent)
