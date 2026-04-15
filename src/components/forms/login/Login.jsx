import React, { useState } from "react";
import Button from "../../elements/button/Button";
import styles from "./Login.module.scss";

// TODO: Validate the email and password
const Login = ({ onPasswordReset, onLogin }) => {
    const [loginCredentials, setLoginCredentials] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLoginCredentials({ ...loginCredentials, [name]: value });
    };
    const invalid = loginCredentials.email === "" || loginCredentials.password === "";

    return (
        <div className={styles.container}>
            <div className={styles.formContainer}>
                <label>Email address</label>
                <input
                    type="email"
                    placeholder="name@example.com"
                    name="email"
                    onChange={handleChange}
                    value={loginCredentials.email}
                    autoComplete="email"
                />

                <label>Password</label>
                <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    onChange={handleChange}
                    value={loginCredentials.password}
                    autoComplete="current-password"
                />

                <button type="button" className={styles.linkLike} onClick={onPasswordReset}>
                    Forgot password?
                </button>

                <Button type="submit" fullWidth disabled={invalid} onClick={() => onLogin(loginCredentials)}>
                    Log in
                </Button>
            </div>
        </div>
    );
};

export default Login;
