import React, { useState } from "react"
import Container from "../layout/container/Container"
import Button from "../../components/elements/button/Button";
import styles from "./Login.module.scss"
import { Link } from "react-router-dom";


const Login = ({ onFormChange, onLogin }) => {

    //TODO: add validation for email and password
    const [loginCredentials, setLoginCredentials] = useState({
        email: "",
        password: "",
    });

    const handelChange = (e) => {
        const value = e.target.value;
        setLoginCredentials({ ...loginCredentials, [e.target.name]: value });
    };

    const invalid = loginCredentials.email === "" || loginCredentials.password === "";

    return <div>
        <div>
            <Container></Container>
        </div>
        <div className={styles.formContainer}>
            <label>Email address</label>
            <input
                type="email"
                placeholder="Enter email"
                data-ng-init="resp()"
                name="email"
                onChange={handelChange}
                value={loginCredentials.email}
            />

            <label>Password</label>
            <input
                type="password"
                placeholder="Password"
                data-ng-init="resp()"
                name="password"
                onChange={handelChange}
                value={loginCredentials.password}
            />

            <Link onClick={onFormChange}> Forgot Password ? </Link>

            <Button onClick={() => onLogin(loginCredentials)} disabled={invalid}>
                Sign in
            </Button>
        </div>
    </div>
}

export default Login