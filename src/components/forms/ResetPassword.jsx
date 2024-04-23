import React, { useState } from "react";
import Container from "../layout/container/Container";
import Button from "../elements/button/Button";
import styles from './Login.module.scss'


//TODO: set a better alert 
//TODO: add validation for email
const ResetPassword = ({ onPasswordReset }) => {

    const [email, setEmail] = useState();

    const enterEmail = (event) => {
        const enteredEmail = event.target.value;
        setEmail(enteredEmail);
    };

    const invalid = email === "";

    return <div>
        <div>
            <Container></Container>
        </div>

        <div className={styles.formContainer}>

            <label>Email</label>
            <input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={enterEmail}
            />

            <Button onClick={onPasswordReset} disabled={invalid}>
                Reset Password
            </Button>
        </div>
    </div>

}

export default ResetPassword