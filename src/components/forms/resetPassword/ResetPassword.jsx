import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "../../elements/button/Button";
import styles from './ResetPassword.module.scss'


//TODO: set a better alert 
//TODO: add validation for email
const ResetPassword = ({ onPasswordReset }) => {

    const [email, setEmail] = useState();

    const enterEmail = (event) => {
        const enteredEmail = event.target.value;
        setEmail(enteredEmail);
    };

    const invalid = email === "";

    return <div className={styles.container}>
        <Form>
            <div className={styles.formContainer}>

                <label>Email</label>
                <input
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={enterEmail}
                    autoComplete=""
                />

                <Button onClick={onPasswordReset} disabled={invalid}>
                    Reset Password
                </Button>
            </div>
        </Form>
    </div>

}

export default ResetPassword