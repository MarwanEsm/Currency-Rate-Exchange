import styles from "./ErrorMessage.module.scss"


const ErrorMessage = ({ onPasswordForget }) =>
    <div className={styles.container}>
        <p>Oops! It seems there's already an account registered with this email address.
            Please try signing in instead or use a different email to create a new account.</p>
        <label>If you've forgotten your password, you can reset it using the
            <span onClick={() => onPasswordForget()}>'Forgot Password'</span> option.
        </label>
        <div>Thank you!</div>
    </div>


export default ErrorMessage