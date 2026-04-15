import styles from "./ErrorMessage.module.scss"
import { useIsDesktop } from "../../../utils/service"

const ERROR_CONTENT = {
    0: {
        mobile:
            "Something went wrong while signing in. Please try again in a moment.",
        desktop:
            "Something went wrong while signing in. Please try again in a moment.",
        showPasswordReset: false,
    },
    1: {
        mobile:
            "Oops! An account already exists with this email. Please sign in or use a different email to create a new account.",
        desktop:
            "Oops! It seems there's already an account registered with this email address. Please try signing in instead or use a different email to create a new account.",
        showPasswordReset: true,
    },
    5: {
        mobile:
            "Invalid email or password. Please check your credentials and try again.",
        desktop:
            "Invalid email or password. Please check your credentials and try again.",
        showPasswordReset: true,
    },
};

const ErrorMessage = ({ errorCode = 0, onPasswordForget }) => {

    const isDesktop = useIsDesktop()
    const content = ERROR_CONTENT[errorCode] ?? ERROR_CONTENT[0];

    if (!isDesktop) {
        return <div className={styles.container}>
            <p>{content.mobile}</p>
            {content.showPasswordReset && (
                <label>Forgot your password ?
                    <button type="button" className={styles.inlineAction} onClick={() => onPasswordForget?.()}>&nbsp; Reset it here</button>.
                </label>
            )}
            <div>Thank you!</div>
        </div>

    }

    return <div className={styles.container}>
        <p>{content.desktop}</p>
        {content.showPasswordReset && (
            <label>If you've forgotten your password, you can reset it using the
                <button type="button" className={styles.inlineAction} onClick={() => onPasswordForget?.()}>Forgot Password</button> option.
            </label>
        )}
        <div>Thank you!</div>
    </div>


}

export default ErrorMessage