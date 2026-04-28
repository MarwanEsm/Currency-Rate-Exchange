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

const ErrorIcon = () => (
    <svg className={styles.iconSvg} width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
        <path
            fill="currentColor"
            d="M12 7.15a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm-1 4.05h2v5.1h-2v-5.1z"
        />
    </svg>
);

/**
 * @param {{ errorCode?: string, onPasswordResetRequest?: () => void, onDismiss?: () => void }} props
 */
const ErrorMessage = ({ errorCode = AUTH_ERROR_CODES.UNKNOWN, onPasswordResetRequest, onDismiss }) => {
    const isDesktop = useIsDesktop();
    const content = ERROR_CONTENT[errorCode] ?? ERROR_CONTENT[AUTH_ERROR_CODES.UNKNOWN];
    const mainText = isDesktop ? content.desktop : content.mobile;

    return (
        <div className={styles.wrap} role="alert" aria-live="polite">
            <div className={styles.hero}>
                <div className={styles.iconBadge}>
                    <ErrorIcon />
                </div>
                <div className={styles.copy}>
                    <p className={styles.lead}>{mainText}</p>
                    {content.showPasswordReset ? (
                        <p className={styles.recovery}>
                            If you&apos;ve forgotten your password, use{" "}
                            <button type="button" className={styles.linkBtn} onClick={() => onPasswordResetRequest?.()}>
                                Forgot password
                            </button>
                            .
                        </p>
                    ) : null}
                </div>
            </div>
            {typeof onDismiss === "function" ? (
                <div className={styles.footer}>
                    <button type="button" className={styles.retryBtn} onClick={onDismiss}>
                        Try again
                    </button>
                </div>
            ) : null}
        </div>
    );
};

export default ErrorMessage;
