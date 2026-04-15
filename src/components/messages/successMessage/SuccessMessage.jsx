import styles from "./SuccessMessage.module.scss";


const SuccessMessage = () =>
    <div className={styles.container}>
        <p>Registration successful.</p>
        <label>You can now log in and start exploring exchange rates.</label>
    </div>;

export default SuccessMessage;