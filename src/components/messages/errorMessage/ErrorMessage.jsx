import styles from "./ErrorMessage.module.scss";
import { useIsDesktop } from "@/utils/service";
import { AUTH_ERROR_CODES } from "@/firebase/authContext";

const ERROR_CONTENT = {
    [AUTH_ERROR_CODES.UNKNOWN]: {
        mobile:
            "Something went wrong while signing in. Please try again in a moment.",
        desktop:
            "Something went wrong while signing in. Please try again in a moment.",
        showPasswordReset: false,
    },
    [AUTH_ERROR_CODES.USER_ALREADY_EXISTS]: {
        mobile:
            "Oops! An account already exists with this email. Please sign in or use a different email to create a new account.",
        desktop:
            "Oops! It seems there is already an account registered with this email address. Please try signing in instead or use a different email to create a new account.",
        showPasswordReset: true,
    },
    [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: {
        mobile:
            "Invalid email or password. Please check your credentials and try again.",
        desktop:
            "Invalid email or password. Please check your credentials and try again.",
        showPasswordReset: true,
    },
    [AUTH_ERROR_CODES.PROFILE_UPDATE_FAILED]: {
        mobile:
            "We created your account but could not finish profile setup. Please try again.",
        desktop:
            "We created your account but could not finish profile setup. Please try again.",
        showPasswordReset: false,
    },
    [AUTH_ERROR_CODES.REGISTRATION_FAILED]: {
        mobile:
            "Registration details are invalid. Please review your entries and try again.",
        desktop:
            "Registration details are invalid. Please review your entries and try again.",
        showPasswordReset: false,
    },
};

const ErrorMessage = ({ errorCode = AUTH_ERROR_CODES.UNKNOWN, onPasswordResetRequest }) => {

    const isDesktop = useIsDesktop();
    const content = ERROR_CONTENT[errorCode] ?? ERROR_CONTENT[AUTH_ERROR_CODES.UNKNOWN];

    if (!isDesktop) {
        return <div className={styles.container}>
            <p>{content.mobile}</p>
            {content.showPasswordReset && (
                <label>Forgot your password?
                    <button type="button" className={styles.inlineAction} onClick={() => onPasswordResetRequest?.()}>&nbsp; Reset it here</button>.
                </label>
            )}
            <div>Thank you!</div>
        </div>

    }

    return <div className={styles.container}>
        <p>{content.desktop}</p>
        {content.showPasswordReset && (
            <label>If you&apos;ve forgotten your password, you can reset it using the
                <button type="button" className={styles.inlineAction} onClick={() => onPasswordResetRequest?.()}>Forgot Password</button> option.
            </label>
        )}
        <div>Thank you!</div>
    </div>


};

export default ErrorMessage;