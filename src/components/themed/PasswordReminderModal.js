// @flow

import { type EdgeAccount } from 'edge-core-js'
import * as React from 'react'
import { Platform, View } from 'react-native'
import { type AirshipBridge } from 'react-native-airship'
import { Actions } from 'react-native-router-flux'
import { connect } from 'react-redux'

import { CHANGE_PASSWORD } from '../../constants/indexConstants.js'
import s from '../../locales/strings.js'
import { postponePasswordReminder, requestChangePassword } from '../../modules/UI/components/PasswordReminderModal/actions.js'
import { type Dispatch, type RootState } from '../../types/reduxTypes.js'
import { showToast } from '../services/AirshipInstance.js'
import { EdgeTextField } from './EdgeTextField.js'
import { ModalCloseArrow, ModalMessage, ModalTitle } from './ModalParts.js'
import { PrimaryButton } from './ThemedButtons.js'
import { ThemedModal } from './ThemedModal.js'

type OwnProps = {
  bridge: AirshipBridge<void>
}

type StateProps = {
  account: EdgeAccount
}

type DispatchProps = {
  onPostpone: () => void,
  onRequestChangePassword: () => void
}

type State = {
  errorMessage?: string,
  password: string,
  spinning: boolean
}

type Props = OwnProps & StateProps & DispatchProps

class PasswordReminderModalComponent extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { spinning: false, password: '' }
  }

  handleCancel = () => {
    if (!this.state.spinning) {
      this.props.onPostpone()
      this.props.bridge.resolve()
    }
  }

  handleRequestChangePassword = () => {
    if (!this.state.spinning) {
      this.props.bridge.resolve()
      this.props.onRequestChangePassword()
      setTimeout(() => Actions.jump(CHANGE_PASSWORD), 10)
    }
  }

  handleSubmit = () => {
    const { bridge, account } = this.props
    const { password } = this.state

    this.setState({ spinning: true })
    account.checkPassword(password).then(isValidPassword => {
      if (isValidPassword) {
        this.setState({ spinning: false })
        showToast(s.strings.password_reminder_great_job)
        setTimeout(() => bridge.resolve(), 10)
      } else {
        this.setState({ errorMessage: s.strings.password_reminder_invalid, spinning: false })
      }
    })
  }

  handleChangeText = (password: string) => this.setState({ password })

  render() {
    const { bridge } = this.props
    const { errorMessage, password, spinning } = this.state

    return (
      <ThemedModal bridge={bridge} onCancel={this.handleCancel}>
        <ModalTitle>{s.strings.password_reminder_remember_your_password}</ModalTitle>
        <ModalMessage>{s.strings.password_reminder_you_will_need_your_password}</ModalMessage>
        <ModalMessage>{s.strings.password_reminder_enter_password_below}</ModalMessage>
        <EdgeTextField
          autoFocus
          secureTextEntry
          error={errorMessage}
          label={s.strings.password}
          onChangeText={this.handleChangeText}
          onSubmitEditing={this.handleSubmit}
          value={password}
        />
        {
          // Hack around the Android keyboard glitch:
          Platform.OS === 'android' ? <View style={{ flex: 1 }} /> : null
        }
        {spinning ? (
          <PrimaryButton marginRem={0.5} spinner />
        ) : (
          <PrimaryButton label={s.strings.password_reminder_check_password} marginRem={0.5} onPress={this.handleSubmit} />
        )}
        <PrimaryButton label={s.strings.password_reminder_forgot_password} marginRem={0.5} onPress={this.handleRequestChangePassword} />
        <ModalCloseArrow onPress={this.handleCancel} />
      </ThemedModal>
    )
  }
}

export const PasswordReminderModal = connect(
  (state: RootState): StateProps => ({
    account: state.core.account
  }),
  (dispatch: Dispatch): DispatchProps => ({
    onRequestChangePassword: () => dispatch(requestChangePassword()),
    onPostpone: () => dispatch(postponePasswordReminder())
  })
)(PasswordReminderModalComponent)
