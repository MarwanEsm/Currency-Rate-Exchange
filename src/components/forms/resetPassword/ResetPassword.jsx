import React, { useState } from "react";
import Button from "../../elements/button/Button";
import styles from './ResetPassword.module.scss'



const ResetPassword = ({ onPasswordReset }) => {

    const [email, setEmail] = useState();

    const enterEmail = (event) => {
        const enteredEmail = event.target.value;
        setEmail(enteredEmail);
    };

    const invalid = email === "";

    return <div className={styles.container}>
        <form>
            <div className={styles.formContainer}>
                <input
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={enterEmail}
                    autoComplete="off"
                />

                <Button onClick={onPasswordReset} disabled={invalid}>
                    Reset Password
                </Button>
            </div>
        </form>
    </div>

}

export default ResetPassword