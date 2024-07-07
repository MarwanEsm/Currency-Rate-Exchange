import styles from "./ErrorMessage.module.scss"
import { useIsDesktop } from "../../../utils/service"

const ErrorMessage = ({ onPasswordForget }) => {

    const isDesktop = useIsDesktop()

    if (!isDesktop) {
        return <div className={styles.container}>
            <p>Oops! An account already exists with this email. Please sign in or use a different email to create a new account.</p>
            <label>Forgot your password ?
                <span onClick={() => onPasswordForget()}>&nbsp; Reset it here</span>.
            </label>
            <div>Thank you!</div>
        </div>

    }

    return <div className={styles.container}>
        <p>Oops! It seems there's already an account registered with this email address.
            Please try signing in instead or use a different email to create a new account.</p>
        <label>If you've forgotten your password, you can reset it using the
            <span onClick={() => onPasswordForget()}>Forgot Password</span> option.
        </label>
        <div>Thank you!</div>
    </div>


}

export default ErrorMessage