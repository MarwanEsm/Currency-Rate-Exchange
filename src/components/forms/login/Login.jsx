import React, { useState } from "react";
import Button from "../../elements/button/Button";
import styles from "./Login.module.scss";
import { Link } from "react-router-dom";

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

    const handleSubmit = (e) => {
        console.log(e);
    }

    return (
        <div className={styles.container}>
            {/* <form > */}
            <div className={styles.formContainer}>
                <label>Email address</label>
                <input
                    type="email"
                    placeholder="example: jo@gmail.com"
                    name="email"
                    onChange={handleChange}
                    value={loginCredentials.email}
                    autoComplete="off"
                />

                <label>Password</label>
                <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    onChange={handleChange}
                    value={loginCredentials.password}
                    autoComplete="off"
                />

                <Link onClick={onPasswordReset}> Forgot Password? </Link>

                <Button type="submit" disabled={invalid} onClick={() => onLogin(loginCredentials)}>
                    Sign in
                </Button>
            </div>
            {/* </form> */}
        </div>
    );
};

export default Login;
