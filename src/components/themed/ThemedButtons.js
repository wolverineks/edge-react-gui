// @flow

import * as React from 'react'
import { Text, TouchableHighlight, TouchableOpacity, View } from 'react-native'
import { cacheStyles } from 'react-native-patina'
import IonIcon from 'react-native-vector-icons/Ionicons'

import { unpackEdges } from '../../util/edges.js'
import { type Theme, useTheme } from '../services/ThemeContext.js'

type Props = {
  children?: React.Node,
  onPress?: () => void | Promise<void>,

  // If this is set, the component will insert a text node before the other children:
  label?: string,

  // The gap around the button. Takes 0-4 numbers (top, right, bottom, left),
  // using the same logic as the web `margin` property. Defaults to 0.
  marginRem?: number[] | number,

  // The gap inside the button. Takes 0-4 numbers (top, right, bottom, left),
  // using the same logic as the web `padding` property. Defaults to 0.5.
  paddingRem?: number[] | number,

  disabled?: boolean
}

type ColorProps = {
  color: 'success' | 'danger' | 'default'
}

type SquareButtonProps = Props & ColorProps
type RadioButtonProps = Props & { value: boolean, right?: boolean }

export function PrimaryButton(props: Props) {
  const { children, label, onPress, disabled } = props
  const theme = useTheme()
  const styles = getStyles(theme)

  return (
    <TouchableOpacity style={[styles.primaryButton, spacingStyles(props, theme), disabled ? styles.disabled : null]} onPress={onPress} disabled={disabled}>
      {label != null ? <Text style={styles.primaryText}>{label}</Text> : null}
      {children}
    </TouchableOpacity>
  )
}

export function SecondaryButton(props: Props) {
  const { children, label, onPress, disabled } = props
  const theme = useTheme()
  const styles = getStyles(theme)

  return (
    <TouchableOpacity style={[styles.secondaryButton, spacingStyles(props, theme), disabled ? styles.disabled : null]} onPress={onPress} disabled={disabled}>
      {label != null ? <Text style={styles.secondaryText}>{label}</Text> : null}
      {children}
    </TouchableOpacity>
  )
}

export function ClickableText(props: Props) {
  const { children, label, onPress } = props
  const theme = useTheme()
  const styles = getStyles(theme)

  return (
    <TouchableHighlight style={spacingStyles(props, theme)} onPress={onPress} underlayColor={theme.secondaryButton}>
      <View>
        {label != null ? <Text style={styles.primaryText}>{label}</Text> : null}
        {children}
      </View>
    </TouchableHighlight>
  )
}

export function SquareButton(props: SquareButtonProps) {
  const { children, label, color, onPress } = props
  const theme = useTheme()
  const styles = getStyles(theme)
  const colorStyleName = `${color}Button`

  return (
    <TouchableOpacity style={[styles.squareButton, spacingStyles(props, theme), styles[colorStyleName]]} onPress={onPress}>
      {label != null ? <Text style={styles.squareText}>{label}</Text> : null}
      {children}
    </TouchableOpacity>
  )
}

export function ButtonBox(props: Props) {
  const { children, onPress } = props
  const theme = useTheme()
  const styles = getStyles(theme)

  return (
    <View style={[spacingStyles(props, theme), styles.buttonBox]}>
      <TouchableHighlight activeOpacity={theme.underlayOpacity} underlayColor={theme.underlayColor} onPress={onPress}>
        {children}
      </TouchableHighlight>
    </View>
  )
}

export function Radio(props: RadioButtonProps) {
  const { children, value, right, onPress } = props
  const theme = useTheme()
  const styles = getStyles(theme)

  return (
    <View style={spacingStyles(props, theme)}>
      <TouchableHighlight activeOpacity={theme.underlayOpacity} underlayColor={theme.secondaryButton} onPress={onPress}>
        <View style={[styles.radio, right && styles.radioRight]}>
          <RadioIcon value={value} />
          {children}
        </View>
      </TouchableHighlight>
    </View>
  )
}

export function RadioIcon(props: { value: boolean }) {
  const { value } = props
  const theme = useTheme()

  const icon = value ? (
    <IonIcon size={theme.rem(1.25)} color={theme.iconTappable} name="ios-radio-button-on" />
  ) : (
    <IonIcon size={theme.rem(1.25)} color={theme.icon} name="ios-radio-button-off" />
  )

  return icon
}

function spacingStyles(props: Props, theme: Theme) {
  const marginRem = unpackEdges(props.marginRem)
  const paddingRem = unpackEdges(props.paddingRem ?? 0.5)

  return {
    marginBottom: theme.rem(marginRem.bottom),
    marginLeft: theme.rem(marginRem.left),
    marginRight: theme.rem(marginRem.right),
    marginTop: theme.rem(marginRem.top),
    paddingBottom: theme.rem(paddingRem.bottom),
    paddingLeft: theme.rem(paddingRem.left),
    paddingRight: theme.rem(paddingRem.right),
    paddingTop: theme.rem(paddingRem.top)
  }
}

const getStyles = cacheStyles((theme: Theme) => {
  const commonButton = {
    alignItems: 'center',
    borderRadius: theme.rem(1.5),
    borderWidth: theme.rem(0.1),
    flexDirection: 'row',
    justifyContent: 'center'
  }
  const commonText = {
    fontFamily: theme.fontFaceBold,
    fontSize: theme.rem(1),
    lineHeight: theme.rem(2),
    marginHorizontal: theme.rem(0.5)
  }

  return {
    primaryButton: {
      ...commonButton,
      backgroundColor: theme.primaryButton,
      borderColor: theme.primaryButtonOutline
    },
    primaryText: {
      ...commonText,
      color: theme.primaryButtonText
    },

    secondaryButton: {
      ...commonButton,
      backgroundColor: theme.secondaryButton,
      borderColor: theme.secondaryButtonOutline
    },
    secondaryText: {
      ...commonText,
      color: theme.secondaryButtonText
    },
    squareButton: {
      height: '100%',
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    squareText: {
      ...commonText,
      color: theme.primaryText
    },
    dangerButton: {
      backgroundColor: theme.sliderTabSend
    },
    defaultButton: {
      backgroundColor: theme.sliderTabMore
    },
    successButton: {
      backgroundColor: theme.sliderTabRequest
    },
    radio: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center'
    },
    radioRight: {
      flexDirection: 'row-reverse'
    },
    disabled: {
      opacity: 0.7
    },
    buttonBox: {
      shadowColor: theme.buttonBoxShadow,
      shadowOffset: {
        width: 0,
        height: theme.rem(0.25)
      },
      shadowOpacity: 0.34,
      shadowRadius: theme.rem(0.25),

      elevation: theme.rem(0.5)
    }
  }
})
