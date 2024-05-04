import React, { useState, useContext } from "react";
import Button from "../../elements/button/Button";
import { AuthContext } from "../../../firebase/authContext";
import styles from "./Login.module.scss";
import { Link } from "react-router-dom";

const Login = ({ onPasswordReset }) => {
    const [loginCredentials, setLoginCredentials] = useState({
        email: "",
        password: "",
    });

    const { login } = useContext(AuthContext);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLoginCredentials({ ...loginCredentials, [name]: value });
    };

    const handleLogin = (e) => {
        e.preventDefault();
        login(loginCredentials)
    };

    const invalid = loginCredentials.email === "" || loginCredentials.password === "";

    return (
        <div className={styles.container}>
            <form onSubmit={handleLogin} method="POST">
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

                    <Link onClick={onPasswordReset}> Forgot Password ? </Link>

                    <Button type="submit" disabled={invalid}>
                        Sign in
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Login;
